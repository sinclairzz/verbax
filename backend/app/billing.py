"""Stripe adapter. No local payment simulator and no access from success URLs."""
from datetime import datetime, timedelta, timezone
import stripe
from fastapi import HTTPException
from sqlalchemy import select
from .config import settings
from .db import Assinatura, Caso, Pagamento, Usuario, now
from .security import audit

PRICES = {'avulso': 24790, 'recorrente': 2790}


def gateway():
    cfg = settings()
    if not cfg.stripe_secret_key or not cfg.stripe_webhook_secret:
        raise HTTPException(503, 'Pagamentos ainda não configurados. Adicione as chaves de teste do Stripe para abrir o checkout sandbox.')
    stripe.api_key = cfg.stripe_secret_key
    stripe.max_network_retries = 2
    return stripe


def subscription(db, user):
    return db.scalar(select(Assinatura).where(Assinatura.usuario_id == user.id, Assinatura.organizacao_id == user.organizacao_id))


def full_history(sub):
    return bool(sub and sub.plano == 'recorrente' and sub.status == 'active' and sub.acesso_ate and sub.acesso_ate > now())


def full_case(sub, case_id):
    return full_history(sub) or bool(sub and sub.caso_avulso_id == case_id)


def checkout(db, user, data):
    api = gateway()
    db.scalar(select(Usuario).where(Usuario.id == user.id).with_for_update())
    sub = subscription(db, user)
    if full_history(sub):
        raise HTTPException(409, 'Você já possui uma assinatura ativa.')
    if data.plano == 'avulso':
        case = db.scalar(select(Caso).where(Caso.id == data.caso_id, Caso.organizacao_id == user.organizacao_id, Caso.usuario_id == user.id))
        if not case:
            raise HTTPException(422, 'Crie ou selecione o caso que deseja incluir no plano avulso.')
        if sub.caso_avulso_id:
            raise HTTPException(409, 'Seu caso avulso já está liberado. Para histórico completo, escolha o recorrente.')
    pending = db.scalar(select(Pagamento).where(Pagamento.usuario_id == user.id, Pagamento.status == 'pending').order_by(Pagamento.criado_em.desc()).limit(1))
    if pending and pending.checkout_id:
        existing = api.checkout.Session.retrieve(pending.checkout_id)
        if existing.status == 'open' and pending.plano == data.plano and pending.caso_id == data.caso_id:
            return {'url': existing.url, 'sandbox': pending.sandbox}
        if existing.status == 'open':
            api.checkout.Session.expire(existing.id)
        elif existing.status == 'complete':
            fulfill(db, existing)
            db.commit()
            raise HTTPException(409, 'Um pagamento anterior foi recebido. Atualize o painel antes de contratar novamente.')
        pending.status = 'expired'
    payment = Pagamento(organizacao_id=user.organizacao_id, usuario_id=user.id, plano=data.plano,
        caso_id=data.caso_id if data.plano == 'avulso' else None, valor_centavos=PRICES[data.plano],
        sandbox=not settings().stripe_secret_key.startswith('sk_live_'))
    db.add(payment)
    db.flush()
    price = {'currency':'brl', 'unit_amount':PRICES[data.plano],
        'product_data': {'name': 'VERBA.X - '+ ('Um caso + laudo PDF' if data.plano == 'avulso' else 'Acesso contínuo mensal'),
        'description':'Pagamento único, um caso.' if data.plano == 'avulso' else 'R$ 27,90/mês no cartão. Cobrança recorrente até cancelamento.'}}
    if data.plano == 'recorrente':
        price['recurring'] = {'interval':'month'}
    opts = {'mode':'payment' if data.plano == 'avulso' else 'subscription',
        'line_items':[{'price_data':price,'quantity':1}], 'payment_method_types':['card'],
        'success_url':settings().app_url+'/dashboard/plano?checkout=retorno',
        'cancel_url':settings().app_url+'/checkout?plano='+data.plano+'&cancelado=1',
        'client_reference_id':user.id, 'metadata':{'payment_id':payment.id},
        'custom_text':{'submit':{'message':'Direito de arrependimento: 7 dias corridos, com reembolso integral. '+ ('Pagamento único.' if data.plano == 'avulso' else 'R$ 27,90 por mês, recorrente até cancelamento.')}},
        'idempotency_key':'checkout-'+payment.id}
    if sub.gateway_customer_id:
        opts['customer'] = sub.gateway_customer_id
    else:
        opts['customer_email'] = user.email
        if data.plano == 'avulso':
            opts['customer_creation'] = 'always'
    session = api.checkout.Session.create(**opts)
    payment.checkout_id = session.id
    payment.checkout_url = session.url
    audit(db,user,'checkout.criado',payment.id)
    db.commit()
    return {'url':session.url, 'sandbox':payment.sandbox}


def update_subscription(sub, remote):
    items = remote.get('items', {}).get('data', [])
    period_end = remote.get('current_period_end') or (items[0].get('current_period_end') if items else None)
    sub.gateway_subscription_id = remote['id']
    sub.status = remote['status']
    sub.cancelar_ao_final = bool(remote.get('cancel_at_period_end'))
    sub.acesso_ate = datetime.fromtimestamp(period_end,timezone.utc) if period_end else None
    sub.proxima_cobranca = None if sub.cancelar_ao_final else sub.acesso_ate


def fulfill(db, session, event_time=None):
    if session.get('payment_status') != 'paid':
        return
    payment_id = session.get('metadata',{}).get('payment_id')
    payment = db.scalar(select(Pagamento).where(Pagamento.id == payment_id).with_for_update())
    if not payment or payment.status != 'pending':
        return
    if payment.checkout_id != session['id'] or session.get('client_reference_id') != payment.usuario_id:
        raise ValueError('Checkout não corresponde ao pedido')
    if session.get('currency') != 'brl' or session.get('amount_total') != payment.valor_centavos:
        raise ValueError('Valor ou moeda não corresponde ao pedido')
    if bool(session.get('livemode')) == payment.sandbox:
        raise ValueError('Ambiente de pagamento incompatível')
    user = db.get(Usuario,payment.usuario_id)
    sub = subscription(db,user)
    payment.payment_intent_id = session.get('payment_intent')
    paid_at = event_time or session.get('created')
    if payment.plano == 'recorrente':
        remote = gateway().Subscription.retrieve(session['subscription'])
        update_subscription(sub,remote)
        payment.subscription_id = remote['id']
        invoice_id = session.get('invoice') or remote.get('latest_invoice')
        invoices = gateway().InvoicePayment.list(invoice=invoice_id,status='paid',limit=10)
        for item in invoices.data:
            if item.get('payment',{}).get('type') == 'payment_intent':
                payment.payment_intent_id = item['payment']['payment_intent']
                paid_at = item.get('status_transitions',{}).get('paid_at') or paid_at
                break
    else:
        sub.caso_avulso_id = payment.caso_id
        sub.status = 'active'
    if not payment.payment_intent_id:
        raise ValueError('Pagamento confirmado ainda sem identificador para reembolso; repetir evento')
    sub.plano = payment.plano
    sub.gateway_customer_id = session.get('customer')
    payment.status = 'paid'
    payment.pago_em = datetime.fromtimestamp(paid_at,timezone.utc)
    audit(db,user,'pagamento.confirmado',payment.id)


def cancel_subscription(db,user):
    sub = subscription(db,user)
    if not sub.gateway_subscription_id or sub.status != 'active':
        raise HTTPException(409, 'Não há assinatura ativa para cancelar.')
    remote = gateway().Subscription.modify(sub.gateway_subscription_id,cancel_at_period_end=True,
        idempotency_key='cancel-'+sub.gateway_subscription_id)
    update_subscription(sub,remote)
    audit(db,user,'assinatura.cancelamento_agendado',sub.id)
    db.commit()
    return {'mensagem':'Renovação cancelada. Seu acesso continua até o fim do período já pago.'}


def refund(db,user,payment_id):
    payment = db.scalar(select(Pagamento).where(Pagamento.id == payment_id,Pagamento.usuario_id == user.id,
        Pagamento.organizacao_id == user.organizacao_id).with_for_update())
    if not payment:
        raise HTTPException(404,'Pagamento não encontrado.')
    if payment.status == 'refunded':
        return {'mensagem':'Este pagamento já foi reembolsado.'}
    if not payment.pago_em or payment.status not in ('paid','refund_pending'):
        raise HTTPException(409,'Este pagamento ainda não está disponível para reembolso.')
    if not payment.refund_solicitado_em and now() > payment.pago_em+timedelta(days=7):
        raise HTTPException(422,'O prazo de 7 dias desta contratação terminou. Você ainda pode cancelar a renovação ou contatar o suporte.')
    # Persist the timely request before any network call, so retries keep eligibility.
    if not payment.refund_solicitado_em:
        payment.refund_solicitado_em = now()
    payment.status = 'refund_pending'
    db.commit()
    api = gateway()
    if payment.subscription_id:
        remote = api.Subscription.retrieve(payment.subscription_id)
        if remote.status != 'canceled':
            api.Subscription.cancel(payment.subscription_id,idempotency_key='refund-cancel-'+payment.id)
    result = api.Refund.create(payment_intent=payment.payment_intent_id,amount=payment.valor_centavos,
        metadata={'payment_id':payment.id}, idempotency_key='refund-'+payment.id)
    payment.refund_id = result.id
    if result.status == 'succeeded':
        revoke(db,payment)
    elif result.status in ('failed','canceled'):
        payment.status = 'refund_failed'
    audit(db,user,'reembolso.solicitado',payment.id)
    db.commit()
    return {'mensagem':'Reembolso integral solicitado. O prazo de crédito depende do emissor do cartão.', 'status':payment.status}


def revoke(db,payment):
    payment.status = 'refunded'
    sub = db.scalar(select(Assinatura).where(Assinatura.usuario_id == payment.usuario_id))
    if payment.plano == 'avulso' and sub.caso_avulso_id == payment.caso_id:
        sub.caso_avulso_id = None
        if sub.plano == 'avulso':
            sub.plano,sub.status = 'gratis','free'
    elif payment.plano == 'recorrente' and sub.gateway_subscription_id == payment.subscription_id:
        sub.status = 'canceled'
        sub.acesso_ate = now()
        sub.proxima_cobranca = None
        sub.cancelar_ao_final = True

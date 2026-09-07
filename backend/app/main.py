import logging
import secrets
from contextlib import asynccontextmanager
from datetime import timedelta, datetime
from fastapi import FastAPI, Depends, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select, delete, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .config import settings
from .db import (SessionLocal, get_db, now, Organizacao, Usuario, Empregado, Empregador, Caso, RegistroSalarial,
    PeriodoAquisitivo, ResultadoCalculo, Divergencia, RegraVersionada, Assinatura, Pagamento, Sessao,
    ResetSenha, WebhookEvent, Solicitation)
from .schemas import Register, Login, GoogleLogin, Forgot, Reset, NewCase, Checkout, Support
from .engine import RULES, VERSION, CalculationInput, calculate, validate_dates
from .security import (current_user, require_csrf, create_session, hasher, verify_password, DUMMY_HASH,
    digest, lookup, audit, masked_cpf, rate_limit, COOKIE)
from .mail import send_reset
from .report import build_pdf
from . import billing
from .supabase_auth import verify_google_access_token

logger = logging.getLogger('verba')


@asynccontextmanager
async def lifespan(app):
    # Migrations are explicit, never destructive on server startup.
    with SessionLocal() as db:
        for key, (_,formula,foundation,url) in RULES.items():
            row = db.scalar(select(RegraVersionada).where(RegraVersionada.nome == key,RegraVersionada.versao == VERSION))
            if not row:
                db.add(RegraVersionada(nome=key,versao=VERSION,formula=formula,fundamento=foundation,fonte_url=url))
                audit(db,None,'regra.publicada',key,VERSION)
            elif (row.formula,row.fundamento,row.fonte_url) != (formula,foundation,url):
                raise RuntimeError('Regra existente mudou sem nova versão: '+key)
        db.commit()
    yield


app = FastAPI(title='VERBA.X API',version='0.1.0',lifespan=lifespan,
    docs_url='/docs' if settings().environment != 'production' else None,redoc_url=None)


@app.middleware('http')
async def service_path_prefix(request: Request, call_next):
    # Vercel Services forwards the original public path to the backend.
    # Keep local routes unchanged while accepting the hosted /api/backend prefix.
    prefix = '/api/backend'
    path = request.scope.get('path', '')
    if path == prefix or path.startswith(prefix + '/'):
        stripped = path[len(prefix):] or '/'
        request.scope['path'] = stripped
        request.scope['raw_path'] = stripped.encode('ascii', 'ignore')
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Never echo submitted passwords/CPF via Pydantic's input field.
    details = [{'campo':'.'.join(str(x) for x in e['loc'][1:]),'mensagem':e['msg']} for e in exc.errors()]
    return JSONResponse(status_code=422,content={'detail':'Revise os campos informados.','erros':details})


@app.middleware('http')
async def safety_headers(request, call_next):
    if int(request.headers.get('content-length','0') or 0) > 65536:
        return JSONResponse(status_code=413,content={'detail':'Requisição muito grande.'})
    try:
        result = await call_next(request)
    except Exception as exc:
        # Avoid logging payloads/PII or Stripe secrets. Full details belong in controlled diagnostics.
        logger.error('request_failed type=%s path=%s',type(exc).__name__,request.url.path)
        return JSONResponse(status_code=500,content={'detail':'Não foi possível concluir. Seus dados enviados anteriormente continuam salvos. Tente novamente.'})
    result.headers['Cache-Control'] = 'no-store'
    result.headers['X-Content-Type-Options'] = 'nosniff'
    result.headers['Referrer-Policy'] = 'no-referrer'
    return result


@app.get('/health')
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status':'ok','engine':VERSION}


@app.get('/config')
def public_config():
    cfg = settings()
    return {'pagamentos_configurados':bool(cfg.stripe_secret_key and cfg.stripe_webhook_secret),
        'sandbox':not cfg.stripe_secret_key.startswith('sk_live_'), 'support_email':cfg.support_email,
        'operator_name':cfg.operator_name,'operator_document':cfg.operator_document}


@app.get('/auth/csrf')
def csrf(response: Response):
    token = secrets.token_urlsafe(32)
    response.set_cookie('verba_csrf',token,httponly=False,secure=settings().environment == 'production',samesite='lax',path='/')
    return {'token':token}


def user_json(db,user):
    sub = billing.subscription(db,user)
    return {'id':user.id,'nome':user.nome,'email':user.email,'modo':user.modo,
        'plano':sub.plano,'historico_completo':billing.full_history(sub),'caso_avulso_id':sub.caso_avulso_id}


@app.post('/auth/register',dependencies=[Depends(require_csrf)],status_code=201)
def register(data: Register,request: Request,response: Response,db: Session = Depends(get_db)):
    rate_limit(db,request,'register',15)
    if db.scalar(select(Usuario).where(Usuario.email_hash == lookup(data.email))):
        raise HTTPException(409,'Não foi possível cadastrar esse e-mail. Tente entrar ou recuperar sua senha.')
    org = Organizacao(nome=data.nome)
    db.add(org)
    db.flush()
    user = Usuario(organizacao_id=org.id,nome=data.nome,email=str(data.email).lower(),email_hash=lookup(data.email),senha_hash=hasher.hash(data.senha))
    db.add(user)
    db.flush()
    db.add(Assinatura(organizacao_id=org.id,usuario_id=user.id))
    create_session(db,user,response)
    audit(db,user,'conta.criada')
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'Não foi possível cadastrar esse e-mail.')
    return user_json(db,user)


@app.post('/auth/login',dependencies=[Depends(require_csrf)])
def login(data: Login,request: Request,response: Response,db: Session = Depends(get_db)):
    rate_limit(db,request,'login',30)
    user = db.scalar(select(Usuario).where(Usuario.email_hash == lookup(data.email)))
    valid = verify_password(data.senha,user.senha_hash if user else DUMMY_HASH)
    if not user or not valid:
        audit(db,None,'login.falhou')
        db.commit()
        raise HTTPException(401,'E-mail ou senha incorretos.')
    if hasher.check_needs_rehash(user.senha_hash):
        user.senha_hash = hasher.hash(data.senha)
    create_session(db,user,response)
    audit(db,user,'login.sucesso')
    db.commit()
    return user_json(db,user)


@app.post('/auth/google',dependencies=[Depends(require_csrf)])
async def google_login(data: GoogleLogin,request: Request,response: Response,db: Session = Depends(get_db)):
    rate_limit(db,request,'google-login',20)
    try:
        identity = await verify_google_access_token(data.access_token)
    except RuntimeError as exc:
        raise HTTPException(503,str(exc))
    except ValueError as exc:
        audit(db,None,'login.google_falhou')
        db.commit()
        raise HTTPException(401,str(exc))

    user = db.scalar(select(Usuario).where(Usuario.email_hash == lookup(identity.email)))
    created = user is None
    if created:
        org = Organizacao(nome=identity.name)
        db.add(org)
        db.flush()
        # Google users do not receive a reusable local password. Password recovery can
        # still establish one later after ownership of the email is confirmed.
        user = Usuario(
            organizacao_id=org.id,
            nome=identity.name,
            email=identity.email,
            email_hash=lookup(identity.email),
            senha_hash=hasher.hash(secrets.token_urlsafe(48)),
        )
        db.add(user)
        db.flush()
        db.add(Assinatura(organizacao_id=org.id,usuario_id=user.id))

    create_session(db,user,response)
    audit(db,user,'conta.google_criada' if created else 'login.google_sucesso')
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409,'Não foi possível concluir o acesso com Google. Tente novamente.')
    return user_json(db,user)


@app.get('/auth/me')
def me(user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    return user_json(db,user)


@app.post('/auth/logout',dependencies=[Depends(require_csrf)])
def logout(request: Request,response: Response,db: Session = Depends(get_db)):
    db.execute(delete(Sessao).where(Sessao.token_hash == digest(request.cookies.get(COOKIE,''))))
    db.commit()
    response.delete_cookie(COOKIE,path='/')
    return {'ok':True}


@app.post('/auth/forgot-password',dependencies=[Depends(require_csrf)])
def forgot(data: Forgot,request: Request,db: Session = Depends(get_db)):
    rate_limit(db,request,'forgot',10)
    user = db.scalar(select(Usuario).where(Usuario.email_hash == lookup(data.email)))
    if user:
        token = secrets.token_urlsafe(40)
        db.execute(delete(ResetSenha).where(ResetSenha.usuario_id == user.id))
        row = ResetSenha(usuario_id=user.id,token_hash=digest(token),expira_em=now()+timedelta(minutes=30))
        db.add(row)
        db.commit()
        try:
            send_reset(user.email,token)
        except Exception:
            audit(db,user,'email.reset_falhou')
            db.commit()
    return {'mensagem':'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'}


@app.post('/auth/reset-password',dependencies=[Depends(require_csrf)])
def reset(data: Reset,request: Request,db: Session = Depends(get_db)):
    rate_limit(db,request,'reset',20)
    row = db.scalar(select(ResetSenha).where(ResetSenha.token_hash == digest(data.token),ResetSenha.usado == False,ResetSenha.expira_em > now()).with_for_update())
    if not row:
        raise HTTPException(400,'Link inválido ou expirado. Solicite outro link.')
    user = db.get(Usuario,row.usuario_id)
    user.senha_hash = hasher.hash(data.senha)
    row.usado = True
    db.execute(delete(Sessao).where(Sessao.usuario_id == user.id))
    audit(db,user,'senha.redefinida')
    db.commit()
    return {'mensagem':'Senha redefinida. Entre com sua nova senha.'}


def basic_calculation(calc):
    # No formula/parameters/snapshot in free server responses.
    return {**{k:v for k,v in calc.items() if k != 'resultados'},
        'resultados':[{k:r[k] for k in ('verba','nome','valor','nivel_confianca')} for r in calc['resultados']]}


@app.post('/simulate',dependencies=[Depends(require_csrf)])
def simulate(data: CalculationInput,request: Request,db: Session = Depends(get_db)):
    rate_limit(db,request,'simulate',90)
    return basic_calculation(calculate(data))


def case_view(db,user,case):
    employee = db.scalar(select(Empregado).where(Empregado.id == case.empregado_id,Empregado.organizacao_id == user.organizacao_id))
    premium = billing.full_case(billing.subscription(db,user),case.id)
    return {'id':case.id,'nome':employee.nome,'cpf_mascarado':masked_cpf(employee.cpf),
        'dados':case.dados,'criado_em':case.criado_em.isoformat(),'completo':premium,
        'calculo':case.resumo if premium else basic_calculation(case.resumo)}


def get_case(db,user,case_id,check_access=True):
    case = db.scalar(select(Caso).where(Caso.id == case_id,Caso.organizacao_id == user.organizacao_id,Caso.usuario_id == user.id))
    if not case:
        raise HTTPException(404,'Caso não encontrado.')
    sub = billing.subscription(db,user)
    if check_access and not billing.full_case(sub,case_id):
        latest = db.scalar(select(Caso.id).where(Caso.organizacao_id == user.organizacao_id,Caso.usuario_id == user.id).order_by(Caso.criado_em.desc()).limit(1))
        if case_id != latest or sub.caso_avulso_id:
            raise HTTPException(403,'O histórico completo está disponível no plano recorrente.')
    return case


@app.get('/cases')
def list_cases(user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    query = select(Caso).where(Caso.organizacao_id == user.organizacao_id,Caso.usuario_id == user.id).order_by(Caso.criado_em.desc())
    sub = billing.subscription(db,user)
    if not billing.full_history(sub):
        query = query.where(Caso.id == sub.caso_avulso_id) if sub.caso_avulso_id else query.limit(1)
    rows = db.scalars(query).all()
    audit(db,user,'casos.listados')
    db.commit()
    return [case_view(db,user,c) for c in rows]


@app.post('/cases',dependencies=[Depends(require_csrf)],status_code=201)
def new_case(data: NewCase,request: Request,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    rate_limit(db,request,'cases',40)
    db.scalar(select(Usuario).where(Usuario.id == user.id).with_for_update())
    sub = billing.subscription(db,user)
    if sub.caso_avulso_id and not billing.full_history(sub):
        raise HTTPException(403,'O plano avulso cobre um caso. Para salvar outro, escolha o recorrente. A simulação pública continua gratuita.')
    try:
        validate_dates(data.calculo,data.admissao,data.demissao)
    except ValueError as exc:
        raise HTTPException(422,str(exc))
    result = calculate(data.calculo)
    employee = Empregado(organizacao_id=user.organizacao_id,nome=data.nome.strip(),cpf=data.cpf)
    db.add(employee)
    employer = None
    if data.empregador:
        employer = Empregador(organizacao_id=user.organizacao_id,dados={'nome':data.empregador})
        db.add(employer)
    db.flush()
    case = Caso(organizacao_id=user.organizacao_id,usuario_id=user.id,empregado_id=employee.id,
        empregador_id=employer.id if employer else None,
        dados={'cargo':data.cargo,'admissao':str(data.admissao),'demissao':str(data.demissao),'empregador':data.empregador},resumo=result)
    db.add(case)
    db.flush()
    scope = {'organizacao_id':user.organizacao_id,'caso_id':case.id}
    db.add(RegistroSalarial(**scope,dados={'salario_base':str(data.calculo.salario_base),'inicio':str(data.admissao),'fim':str(data.demissao)}))
    db.add(PeriodoAquisitivo(**scope,dados={'meses_proporcionais':data.calculo.meses_periodo,'origem':'declarado','status':'pendente_revisao'}))
    for row in result['resultados']:
        rule = db.scalar(select(RegraVersionada).where(RegraVersionada.nome == row['verba'],RegraVersionada.versao == VERSION))
        db.add(ResultadoCalculo(**scope,regra_id=rule.id,data_calculo=datetime.fromisoformat(row['data_calculo']),**{k:row[k] for k in ('verba','valor','formula','parametros','fundamento','versao_regra','snapshot_entrada','nivel_confianca')}))
    for row in result['divergencias']:
        db.add(Divergencia(**scope,**{k:row[k] for k in ('verba','valor_pago','valor_devido','diferenca')}))
    audit(db,user,'caso.calculado',case.id,VERSION)
    db.commit()
    return case_view(db,user,case)


@app.get('/cases/{case_id}')
def show_case(case_id: str,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    case = get_case(db,user,case_id)
    audit(db,user,'caso.lido',case.id)
    db.commit()
    return case_view(db,user,case)


@app.get('/cases/{case_id}/pdf')
def pdf(case_id: str,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    case = get_case(db,user,case_id)
    if not billing.full_case(billing.subscription(db,user),case.id):
        raise HTTPException(403,'Escolha um plano para liberar o laudo completo deste caso.')
    content = build_pdf(case_view(db,user,case))
    audit(db,user,'pdf.exportado',case.id,VERSION)
    db.commit()
    return Response(content,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename="verba-x-{case.id[:8]}.pdf"'})


@app.get('/billing')
def billing_status(user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    sub = billing.subscription(db,user)
    payments = db.scalars(select(Pagamento).where(Pagamento.usuario_id == user.id,Pagamento.organizacao_id == user.organizacao_id).order_by(Pagamento.criado_em.desc())).all()
    return {'plano':sub.plano,'status':sub.status,'proxima_cobranca':sub.proxima_cobranca,
        'acesso_ate':sub.acesso_ate,'cancelar_ao_final':sub.cancelar_ao_final,'caso_avulso_id':sub.caso_avulso_id,
        'pagamentos':[{'id':p.id,'plano':p.plano,'valor_centavos':p.valor_centavos,'status':p.status,'pago_em':p.pago_em,
        'sandbox':p.sandbox,'reembolsavel':bool(p.pago_em and p.status in ('paid','refund_pending') and (p.refund_solicitado_em or now() <= p.pago_em+timedelta(days=7))),
        'prazo_reembolso':p.pago_em+timedelta(days=7) if p.pago_em else None} for p in payments]}


@app.post('/billing/checkout',dependencies=[Depends(require_csrf)])
def create_checkout(data: Checkout,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    return billing.checkout(db,user,data)


@app.post('/billing/sync',dependencies=[Depends(require_csrf)])
def sync_checkout(user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    rows = db.scalars(select(Pagamento).where(Pagamento.usuario_id == user.id,Pagamento.status == 'pending',Pagamento.checkout_id != None)).all()
    for payment in rows:
        remote = billing.gateway().checkout.Session.retrieve(payment.checkout_id)
        billing.fulfill(db,remote)
    db.commit()
    return {'ok':True}


@app.post('/billing/cancel',dependencies=[Depends(require_csrf)])
def cancel(user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    return billing.cancel_subscription(db,user)


@app.post('/billing/refund/{payment_id}',dependencies=[Depends(require_csrf)])
def refund(payment_id: str,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    return billing.refund(db,user,payment_id)


@app.post('/billing/webhook')
async def webhook(request: Request,db: Session = Depends(get_db)):
    cfg = settings()
    api = billing.gateway()
    try:
        event = api.Webhook.construct_event(await request.body(),request.headers.get('stripe-signature',''),cfg.stripe_webhook_secret)
    except (ValueError,api.SignatureVerificationError):
        raise HTTPException(400,'Assinatura do webhook inválida.')
    if bool(event.get('livemode')) != cfg.stripe_secret_key.startswith('sk_live_'):
        raise HTTPException(400,'Ambiente incorreto.')
    # Unique event receipt participates in the same transaction as entitlement updates.
    from sqlalchemy.dialects.postgresql import insert
    inserted = db.execute(insert(WebhookEvent).values(id=event.id,tipo=event.type).on_conflict_do_nothing().returning(WebhookEvent.id)).scalar_one_or_none()
    if not inserted:
        return {'received':True}
    obj = event.data.object
    if event.type in ('checkout.session.completed','checkout.session.async_payment_succeeded'):
        billing.fulfill(db,obj,event.created)
    elif event.type in ('customer.subscription.updated','customer.subscription.deleted'):
        sub = db.scalar(select(Assinatura).where(Assinatura.gateway_subscription_id == obj.id).with_for_update())
        if sub:
            # Retrieve authoritative latest state: delayed events cannot resurrect access.
            remote = api.Subscription.retrieve(obj.id)
            billing.update_subscription(sub,remote)
    elif event.type in ('invoice.paid','invoice.payment_failed'):
        subscription_id = obj.get('subscription') or obj.get('parent',{}).get('subscription_details',{}).get('subscription')
        if subscription_id:
            sub = db.scalar(select(Assinatura).where(Assinatura.gateway_subscription_id == subscription_id).with_for_update())
            if sub:
                billing.update_subscription(sub,api.Subscription.retrieve(subscription_id))
    elif event.type in ('refund.updated','refund.created'):
        payment = db.scalar(select(Pagamento).where(Pagamento.payment_intent_id == obj.get('payment_intent')).with_for_update())
        if payment and obj.get('amount') == payment.valor_centavos:
            if obj.status == 'succeeded':
                billing.revoke(db,payment)
            elif obj.status in ('failed','canceled'):
                payment.status = 'refund_failed'
    elif event.type == 'charge.refunded':
        payment = db.scalar(select(Pagamento).where(Pagamento.payment_intent_id == obj.get('payment_intent')).with_for_update())
        if payment and obj.get('amount_refunded',0) >= payment.valor_centavos:
            billing.revoke(db,payment)
    db.commit()
    return {'received':True}


@app.post('/support',dependencies=[Depends(require_csrf)],status_code=201)
def support(data: Support,request: Request,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    rate_limit(db,request,'support',10)
    row = Solicitation(organizacao_id=user.organizacao_id,usuario_id=user.id,tipo=data.tipo,mensagem=data.mensagem)
    db.add(row)
    db.flush()
    audit(db,user,'solicitacao.recebida',row.id)
    db.commit()
    return {'protocolo':row.id,'mensagem':'Solicitação registrada. Guarde o protocolo para acompanhamento.'}


@app.delete('/account',dependencies=[Depends(require_csrf)])
def delete_account(data: Login,response: Response,user: Usuario = Depends(current_user),db: Session = Depends(get_db)):
    if lookup(data.email) != user.email_hash or not verify_password(data.senha,user.senha_hash):
        raise HTTPException(401,'Confirme seu e-mail e sua senha para excluir a conta.')
    sub = billing.subscription(db,user)
    if sub.gateway_subscription_id and sub.status not in ('canceled','free'):
        api = billing.gateway()
        remote = api.Subscription.retrieve(sub.gateway_subscription_id)
        if remote.status != 'canceled':
            api.Subscription.cancel(remote.id,idempotency_key='delete-account-'+user.id)
    pending = db.scalars(select(Pagamento).where(Pagamento.usuario_id == user.id,Pagamento.status == 'pending',Pagamento.checkout_id != None)).all()
    for row in pending:
        remote = billing.gateway().checkout.Session.retrieve(row.checkout_id)
        if remote.status == 'open':
            billing.gateway().checkout.Session.expire(remote.id)
        elif remote.status == 'complete':
            raise HTTPException(409,'Existe um pagamento em confirmação. Atualize seu plano e solicite eventual reembolso antes da exclusão.')
    # Delete only the authenticated single-user worker organization, with all owned records.
    audit(db,user,'conta.excluida')
    db.execute(delete(Organizacao).where(Organizacao.id == user.organizacao_id))
    db.commit()
    response.delete_cookie(COOKIE,path='/')
    return {'mensagem':'Conta e dados dos casos excluídos. Registros de pagamento no gateway seguem a política do Stripe.'}

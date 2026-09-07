import hashlib
import hmac
import json
import time
from datetime import timedelta
from pathlib import Path
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from cryptography.fernet import Fernet
from pypdf import PdfReader
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from app.db import SessionLocal, Usuario, Caso, Empregado, Assinatura, Pagamento, ResultadoCalculo, ResetSenha, now
from app.security import digest, lookup
from app.config import settings
from app import billing
from app import main as main_module
from app.supabase_auth import GoogleIdentity


def new_case(client,data):
    response=client.post('/cases',json=data)
    assert response.status_code==201,response.text
    return response.json()


def test_guest_simulation_and_private_routes(client,input_data):
    assert client.post('/simulate',json=input_data).status_code==200
    assert client.get('/cases').status_code==401
    assert 'formula' not in client.post('/simulate',json=input_data).json()['resultados'][0]


def test_csrf_and_origin_enforced(client,input_data):
    assert client.post('/simulate',json=input_data,headers={'x-csrf-token':''}).status_code==403
    assert client.post('/simulate',json=input_data,headers={'origin':'https://evil.example'}).status_code==403


def test_signup_requires_opt_in(client):
    response=client.post('/auth/register',json={'nome':'Teste','email':'test@example.com','senha':'1234567890','aceite':False})
    assert response.status_code==422
    assert '1234567890' not in response.text


def test_google_login_creates_then_reuses_local_account(client,monkeypatch):
    async def verified(_token):
        return GoogleIdentity(email='google.user@example.com',name='Pessoa Google')

    monkeypatch.setattr(main_module,'verify_google_access_token',verified)
    first=client.post('/auth/google',json={'access_token':'valid-google-token-for-test','aceite':True})
    assert first.status_code==200,first.text
    assert first.json()['email']=='google.user@example.com'
    first_id=first.json()['id']
    assert client.get('/auth/me').status_code==200
    assert client.post('/auth/logout').status_code==200

    second=client.post('/auth/google',json={'access_token':'another-valid-google-token','aceite':True})
    assert second.status_code==200,second.text
    assert second.json()['id']==first_id
    with SessionLocal() as db:
        users=db.scalars(select(Usuario).where(Usuario.email_hash==lookup('google.user@example.com'))).all()
        assert len(users)==1
        assert users[0].senha_hash.startswith('$argon2id$')


def test_google_login_requires_terms_and_verified_token(client,monkeypatch):
    assert client.post('/auth/google',json={'access_token':'valid-google-token-for-test','aceite':False}).status_code==422

    async def rejected(_token):
        raise ValueError('A autenticação com Google expirou ou é inválida.')

    monkeypatch.setattr(main_module,'verify_google_access_token',rejected)
    response=client.post('/auth/google',json={'access_token':'expired-google-token-test','aceite':True})
    assert response.status_code==401
    assert response.json()['detail']=='A autenticação com Google expirou ou é inválida.'


def test_signup_login_session_and_encryption(registered,case_data):
    client,credentials,user=registered
    assert client.get('/auth/me').status_code==200
    item=new_case(client,case_data)
    assert item['cpf_mascarado']=='***.***.***-25'
    assert case_data['cpf'] not in json.dumps(item)
    assert item['calculo']['total_devido']=='12400.00'
    with SessionLocal() as db:
        row=db.get(Usuario,user['id'])
        assert row.senha_hash.startswith('$argon2id$')
        raw=db.execute(text('SELECT nome, email FROM usuarios WHERE id=:id'),{'id':user['id']}).one()
        assert credentials['nome'] not in raw[0] and credentials['email'] not in raw[1]
        assert raw[0].startswith('gAAAA')
        assert len(db.scalars(select(ResultadoCalculo).where(ResultadoCalculo.caso_id==item['id'])).all())==5
    assert client.post('/auth/logout').status_code==200
    assert client.get('/auth/me').status_code==401
    assert client.post('/auth/login',json={'email':credentials['email'],'senha':'wrong'}).status_code==401
    response=client.post('/auth/login',json={'email':credentials['email'],'senha':credentials['senha']})
    assert response.status_code==200 and 'HttpOnly' in response.headers['set-cookie']


def test_case_and_pdf_tenant_isolation(registered,case_data):
    client,_,user=registered
    item=new_case(client,case_data)
    client.post('/auth/logout')
    assert client.post('/auth/register',json={'nome':'Outra pessoa','email':'other@example.com','senha':'senha-longa-outro','aceite':True}).status_code==201
    assert client.get(f"/cases/{item['id']}").status_code==404
    assert client.get(f"/cases/{item['id']}/pdf").status_code==404
    assert client.get('/cases').json()==[]
    assert client.post('/billing/checkout',json={'plano':'avulso','caso_id':item['id']}).status_code==422


def test_free_pdf_locked_full_report_and_immutable_rules(registered,case_data):
    client,_,user=registered
    item=new_case(client,case_data)
    assert client.get(f"/cases/{item['id']}/pdf").status_code==403
    with SessionLocal.begin() as db:
        sub=db.scalar(select(Assinatura).where(Assinatura.usuario_id==user['id']))
        sub.plano='avulso';sub.status='active';sub.caso_avulso_id=item['id']
    response=client.get(f"/cases/{item['id']}/pdf")
    assert response.status_code==200 and response.content.startswith(b'%PDF')
    report=PdfReader(BytesIO(response.content))
    content='\n'.join(p.extract_text() for p in report.pages)
    assert len(report.pages)>=4
    assert case_data['cpf'] not in content
    assert '12.400,00' in content and '3.900,00' in content
    assert 'a confirmar' in content and 'substitui' in content
    assert 'Memória de cálculo' in content and 'Snapshot' in content
    Path('tmp/pdfs').mkdir(parents=True,exist_ok=True)
    Path('tmp/pdfs/qa-report.pdf').write_bytes(response.content)
    assert 'formula' in client.get(f"/cases/{item['id']}").json()['calculo']['resultados'][0]
    with SessionLocal() as db:
        with pytest.raises(DBAPIError):
            db.execute(text('UPDATE resultados_calculo SET formula=:formula WHERE caso_id=:id'),{'formula':'alterada','id':item['id']})


def test_plan_scoping_and_history(registered,case_data):
    client,_,user=registered
    first=new_case(client,case_data);second=new_case(client,case_data)
    assert [r['id'] for r in client.get('/cases').json()]==[second['id']]
    assert client.get(f"/cases/{first['id']}").status_code==403
    with SessionLocal.begin() as db:
        sub=db.scalar(select(Assinatura).where(Assinatura.usuario_id==user['id']))
        sub.plano='recorrente';sub.status='active';sub.acesso_ate=now()+timedelta(days=30)
    assert len(client.get('/cases').json())==2
    assert client.get(f"/cases/{first['id']}").json()['completo']


def test_dates_and_cpf_validation(registered,case_data):
    client,_,_=registered
    assert client.post('/cases',json=case_data|{'cpf':'11111111111'}).status_code==422
    assert client.post('/cases',json=case_data|{'demissao':'2020-01-01'}).status_code==422


def test_password_reset_email_single_use_revokes_session(registered):
    client,credentials,user=registered
    before=set(Path('.data/mailbox').glob('*.eml.enc')) if Path('.data/mailbox').exists() else set()
    response=client.post('/auth/forgot-password',json={'email':credentials['email']})
    assert response.status_code==200
    after=set(Path('.data/mailbox').glob('*.eml.enc'))
    messages=after-before
    assert len(messages)==1
    from email import message_from_bytes
    raw=Fernet(settings().encryption_key.encode()).decrypt(next(iter(messages)).read_bytes())
    email=message_from_bytes(raw)
    content=email.get_payload(decode=True).decode('utf-8')
    token=content.split('#token=')[1].split()[0]
    assert client.post('/auth/reset-password',json={'token':token,'senha':'Nova-senha-segura-123'}).status_code==200
    assert client.get('/auth/me').status_code==401
    assert client.post('/auth/reset-password',json={'token':token,'senha':'Outra-senha-123'}).status_code==400
    assert client.post('/auth/login',json={'email':credentials['email'],'senha':'Nova-senha-segura-123'}).status_code==200
    for message in messages:message.unlink()


def test_support_and_account_erasure(registered,case_data):
    client,credentials,user=registered
    new_case(client,case_data)
    assert client.post('/support',json={'tipo':'privacidade','mensagem':'Quero consultar meus dados.'}).status_code==201
    assert client.request('DELETE','/account',json={'email':credentials['email'],'senha':'wrong'}).status_code==401
    assert client.request('DELETE','/account',json={'email':credentials['email'],'senha':credentials['senha']}).status_code==200
    assert client.get('/auth/me').status_code==401
    with SessionLocal() as db:
        assert db.get(Usuario,user['id']) is None
        assert db.scalar(select(Caso).where(Caso.usuario_id==user['id'])) is None


@pytest.mark.parametrize('plan,amount,mode',[('avulso',24790,'payment'),('recorrente',2790,'subscription')])
def test_checkout_adapter_exact_prices(registered,case_data,monkeypatch,plan,amount,mode):
    client,_,_=registered
    case=new_case(client,case_data)
    fake=Mock()
    fake.checkout.Session.create.return_value=SimpleNamespace(id='cs_test_1',url='https://checkout.stripe.com/c/pay/cs_test_1')
    monkeypatch.setattr(billing,'gateway',lambda:fake)
    response=client.post('/billing/checkout',json={'plano':plan,'caso_id':case['id']})
    assert response.status_code==200,response.text
    args=fake.checkout.Session.create.call_args.kwargs
    assert args['mode']==mode and args['line_items'][0]['price_data']['unit_amount']==amount
    assert args['payment_method_types']==['card']
    assert 'metadata' in args and 'payment_id' in args['metadata']
    if plan=='recorrente':assert args['line_items'][0]['price_data']['recurring']=={'interval':'month'}


def payment_fixture(user,case_id,age=1,plan='avulso'):
    with SessionLocal.begin() as db:
        p=Pagamento(organizacao_id=db.get(Usuario,user['id']).organizacao_id,usuario_id=user['id'],plano=plan,
            caso_id=case_id,valor_centavos=24790 if plan=='avulso' else 2790,status='paid',pago_em=now()-timedelta(days=age),
            payment_intent_id='pi_test_1',checkout_id='cs_test_1',subscription_id='sub_test_1' if plan=='recorrente' else None)
        db.add(p);db.flush()
        sub=db.scalar(select(Assinatura).where(Assinatura.usuario_id==user['id']))
        sub.plano=plan;sub.status='active';sub.caso_avulso_id=case_id if plan=='avulso' else None
        if plan=='recorrente':sub.gateway_subscription_id='sub_test_1';sub.acesso_ate=now()+timedelta(days=30)
        return p.id


@pytest.mark.parametrize('plan',['avulso','recorrente'])
def test_refund_seven_days_full_and_idempotent(registered,case_data,monkeypatch,plan):
    client,_,user=registered
    case=new_case(client,case_data);payment_id=payment_fixture(user,case['id'],plan=plan)
    fake=Mock();fake.Refund.create.return_value=SimpleNamespace(id='re_test_1',status='succeeded');fake.Subscription.retrieve.return_value=SimpleNamespace(status='active')
    monkeypatch.setattr(billing,'gateway',lambda:fake)
    response=client.post(f'/billing/refund/{payment_id}')
    assert response.status_code==200,response.text
    assert fake.Refund.create.call_args.kwargs['amount']==(24790 if plan=='avulso' else 2790)
    assert client.post(f'/billing/refund/{payment_id}').status_code==200
    assert fake.Refund.create.call_count==1
    assert client.get(f"/cases/{case['id']}/pdf").status_code==403
    if plan=='recorrente':fake.Subscription.cancel.assert_called_once()


def test_refund_outside_window_blocked(registered,case_data,monkeypatch):
    client,_,user=registered
    case=new_case(client,case_data);payment_id=payment_fixture(user,case['id'],age=8)
    fake=Mock();monkeypatch.setattr(billing,'gateway',lambda:fake)
    assert client.post(f'/billing/refund/{payment_id}').status_code==422
    fake.Refund.create.assert_not_called()


def test_signed_webhook_idempotency_and_forgery(registered,case_data):
    client,_,user=registered
    case=new_case(client,case_data)
    with SessionLocal.begin() as db:
        payment=Pagamento(organizacao_id=db.get(Usuario,user['id']).organizacao_id,usuario_id=user['id'],plano='avulso',caso_id=case['id'],valor_centavos=24790,checkout_id='cs_signed',status='pending')
        db.add(payment);db.flush();payment_id=payment.id
    event={'id':'evt_signed_test','object':'event','type':'checkout.session.completed','created':int(time.time()),'livemode':False,
        'data':{'object':{'id':'cs_signed','object':'checkout.session','payment_status':'paid','amount_total':24790,'currency':'brl','livemode':False,
            'metadata':{'payment_id':payment_id},'client_reference_id':user['id'],'payment_intent':'pi_signed','customer':'cus_signed','created':int(time.time())}}}
    raw=json.dumps(event).encode();timestamp=int(time.time());signature=hmac.new(settings().stripe_webhook_secret.encode(),f'{timestamp}.'.encode()+raw,hashlib.sha256).hexdigest()
    assert client.post('/billing/webhook',content=raw,headers={'stripe-signature':'forged'}).status_code==400
    for _ in range(2):assert client.post('/billing/webhook',content=raw,headers={'stripe-signature':f't={timestamp},v1={signature}'}).status_code==200
    assert client.get(f"/cases/{case['id']}/pdf").status_code==200


def test_missing_gateway_keys_blocks_checkout(registered,case_data,monkeypatch):
    client,_,_=registered;case=new_case(client,case_data)
    monkeypatch.setattr(settings(),'stripe_secret_key','')
    response=client.post('/billing/checkout',json={'plano':'avulso','caso_id':case['id']})
    assert response.status_code==503

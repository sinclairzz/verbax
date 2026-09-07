import hashlib
import hmac
import secrets
import time
from datetime import timedelta
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session
from .config import settings
from .db import Usuario, Sessao, AuditLog, RateLimit, get_db, now

hasher = PasswordHasher()
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(32))
COOKIE = 'verba_session'


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def lookup(value):
    return hmac.new(settings().lookup_secret.encode(), value.strip().lower().encode(), hashlib.sha256).hexdigest()


def verify_password(password, encoded):
    try:
        return hasher.verify(encoded, password)
    except VerificationError:
        return False


def audit(db, user, action, resource=None, version=None):
    db.add(AuditLog(organizacao_id=user.organizacao_id if user else None,
        usuario_id=user.id if user else None, acao=action, recurso_id=resource, versao=version))


def rate_limit(db: Session, request: Request, scope: str, limit: int, seconds: int = 900):
    # Shared database counter, atomic across processes. Reverse proxy controls client IP.
    ip = request.headers.get('x-verba-client-ip') if request.client.host in ('127.0.0.1','::1') else request.client.host
    key = lookup(f'{scope}:{ip or request.client.host}')
    window = int(time.time()) // seconds
    stmt = insert(RateLimit).values(chave=key, quantidade=1, janela=window)
    from sqlalchemy import case
    stmt = stmt.on_conflict_do_update(index_elements=['chave'], set_={
        'janela': window, 'quantidade': case((RateLimit.janela == window, RateLimit.quantidade + 1), else_=1)
    }).returning(RateLimit.quantidade)
    count = db.execute(stmt).scalar_one()
    db.commit()
    if count > limit:
        raise HTTPException(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.', headers={'Retry-After': str(seconds)})


def require_csrf(request: Request):
    cookie = request.cookies.get('verba_csrf', '')
    header = request.headers.get('x-csrf-token', '')
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(403, 'Atualize a página e tente novamente.')
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') != settings().app_url.rstrip('/'):
        raise HTTPException(403, 'Origem não autorizada.')


def current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE, '')
    session = db.scalar(select(Sessao).where(Sessao.token_hash == digest(token), Sessao.expira_em > now()))
    if not session:
        raise HTTPException(401, 'Entre na sua conta para continuar.')
    user = db.get(Usuario, session.usuario_id)
    if not user:
        raise HTTPException(401, 'Sessão expirada.')
    return user


def create_session(db, user, response: Response):
    token = secrets.token_urlsafe(48)
    db.add(Sessao(usuario_id=user.id, token_hash=digest(token), expira_em=now()+timedelta(days=7)))
    response.set_cookie(COOKIE, token, max_age=604800, httponly=True,
        secure=settings().environment == 'production', samesite='lax', path='/')


def masked_cpf(value):
    return f'***.***.***-{value[-2:]}'


def valid_cpf(value):
    if len(value) != 11 or not value.isdigit() or len(set(value)) == 1:
        return False
    for length in (9, 10):
        remainder = sum(int(value[i])*(length+1-i) for i in range(length))*10 % 11
        if remainder == 10:
            remainder = 0
        if remainder != int(value[length]):
            return False
    return True

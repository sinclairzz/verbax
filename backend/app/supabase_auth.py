from dataclasses import dataclass

import httpx
from pydantic import EmailStr, TypeAdapter, ValidationError

from .config import settings


@dataclass(frozen=True)
class GoogleIdentity:
    email: str
    name: str


async def verify_google_access_token(access_token: str) -> GoogleIdentity:
    cfg = settings()
    if not cfg.supabase_url or not cfg.supabase_publishable_key:
        raise RuntimeError('Login com Google ainda não foi configurado.')

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{cfg.supabase_url.rstrip('/')}/auth/v1/user",
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'apikey': cfg.supabase_publishable_key,
                },
            )
    except httpx.RequestError as exc:
        raise RuntimeError('Não foi possível validar o acesso com Google.') from exc

    if response.status_code != 200:
        raise ValueError('A autenticação com Google expirou ou é inválida.')

    payload = response.json()
    providers = payload.get('app_metadata', {}).get('providers', [])
    provider = payload.get('app_metadata', {}).get('provider')
    if provider != 'google' and 'google' not in providers:
        raise ValueError('Use uma conta Google para continuar.')
    if not payload.get('email_confirmed_at'):
        raise ValueError('Confirme o e-mail da sua conta Google para continuar.')

    try:
        email = str(TypeAdapter(EmailStr).validate_python(payload.get('email'))).lower()
    except ValidationError as exc:
        raise ValueError('A conta Google não forneceu um e-mail válido.') from exc

    metadata = payload.get('user_metadata') or {}
    name = str(metadata.get('full_name') or metadata.get('name') or email.split('@')[0]).strip()
    return GoogleIdentity(email=email, name=(name[:120] or 'Usuário VERBA.X'))

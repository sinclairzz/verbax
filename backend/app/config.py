from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    environment: str = 'development'
    database_url: str = 'postgresql+psycopg://verba:verba-local-only@127.0.0.1:55432/verba'
    app_url: str = 'http://localhost:3000'
    encryption_key: str = ''
    lookup_secret: str = ''
    stripe_secret_key: str = ''
    stripe_webhook_secret: str = ''
    payments_live_enabled: bool = False
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_tls: bool = True
    email_from: str = ''
    support_email: str = ''
    operator_name: str = ''
    operator_document: str = ''
    legal_review_approved: bool = False

    @model_validator(mode='after')
    def validate_deployment(self):
        if self.environment not in ('development', 'test', 'production'):
            raise ValueError('ENVIRONMENT inválido')
        if not self.encryption_key or len(self.lookup_secret) < 32:
            raise ValueError('Configure ENCRYPTION_KEY e LOOKUP_SECRET; execute scripts/bootstrap.py no desenvolvimento.')
        if self.stripe_secret_key.startswith('sk_live_') and not self.payments_live_enabled:
            raise ValueError('Cobranças reais bloqueadas: PAYMENTS_LIVE_ENABLED=false')
        if self.environment == 'production':
            if not self.app_url.startswith('https://'):
                raise ValueError('HTTPS obrigatório em produção')
            if not self.database_url.startswith('postgresql') or 'sslmode=' not in self.database_url:
                raise ValueError('PostgreSQL com TLS obrigatório em produção')
            if not all([self.smtp_host, self.email_from, self.support_email, self.operator_name, self.operator_document, self.legal_review_approved]):
                raise ValueError('Produção requer SMTP, contato, identificação do operador e revisão jurídica aprovada')
        return self


@lru_cache
def settings():
    return Settings()

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator, model_validator
from .database import normalize_database_url, transaction_pooler


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', hide_input_in_errors=True)
    environment: str = 'development'
    database_url: str = Field(default='postgresql+psycopg://verba:verba-local-only@127.0.0.1:55432/verba', repr=False)
    database_migration_url: str = Field(default='', repr=False)
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

    @field_validator('database_url', 'database_migration_url')
    @classmethod
    def validate_database_url(cls, value, info):
        if not value and info.field_name == 'database_migration_url':
            return ''
        return normalize_database_url(value)

    @property
    def migration_url(self):
        value = self.database_migration_url or self.database_url
        if transaction_pooler(value):
            raise ValueError('Migrações requerem DATABASE_MIGRATION_URL com conexão direta ou Session pooler (5432).')
        return value

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
            from sqlalchemy.engine import make_url
            if any(make_url(url).query.get('sslmode') not in ('require', 'verify-ca', 'verify-full')
                   for url in (self.database_url, self.migration_url)):
                raise ValueError('PostgreSQL com TLS obrigatório em produção')
            if not all([self.smtp_host, self.email_from, self.support_email, self.operator_name, self.operator_document, self.legal_review_approved]):
                raise ValueError('Produção requer SMTP, contato, identificação do operador e revisão jurídica aprovada')
        return self


@lru_cache
def settings():
    return Settings()

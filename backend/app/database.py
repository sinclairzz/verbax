"""PostgreSQL connection options shared by FastAPI, Alembic and diagnostics."""
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


def normalize_database_url(value: str) -> str:
    try:
        url = make_url(value.strip())
        if url.drivername not in ('postgres', 'postgresql', 'postgresql+psycopg'):
            raise ValueError()
        if not url.host or not url.database or not url.username:
            raise ValueError()
        url = url.set(drivername='postgresql+psycopg')
        if url.host.endswith(('.supabase.co', '.pooler.supabase.com')):
            mode = url.query.get('sslmode', 'require')
            if mode not in ('require', 'verify-ca', 'verify-full'):
                raise ValueError('Supabase requer TLS: sslmode=require ou verify-full.')
            url = url.update_query_dict({'sslmode': mode})
        return url.render_as_string(hide_password=False)
    except (ValueError, TypeError) as exc:
        # Never include a connection URL (which contains a password) in errors.
        raise ValueError('URL PostgreSQL inválida ou sem TLS para Supabase.') from None


def transaction_pooler(value: str) -> bool:
    url = make_url(value)
    return bool(url.host and url.host.endswith(('.supabase.co', '.pooler.supabase.com')) and url.port == 6543)


def database_engine(value: str):
    url = normalize_database_url(value)
    options = {'pool_pre_ping': True, 'echo': False, 'hide_parameters': True,
               'connect_args': {'connect_timeout': 10}}
    if transaction_pooler(url):
        # Supavisor transaction mode cannot retain session prepared statements.
        options['poolclass'] = NullPool
        options['connect_args']['prepare_threshold'] = None
    else:
        options.update(pool_size=5, max_overflow=5, pool_recycle=300)
    return create_engine(url, **options)

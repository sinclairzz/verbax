"""Read-only connection/schema check. Does not print credentials or customer data."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))


def main():
    from app.config import Settings
    from app.database import database_engine
    from sqlalchemy import inspect, text
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    cfg = Settings(_env_file=ROOT / '.env')
    engine = database_engine(cfg.database_url)
    try:
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
            print('Conexão PostgreSQL: OK.')
            tls = connection.execute(text('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()')).scalar()
            print('TLS: ' + ('ativo.' if tls else 'inativo (permitido somente no desenvolvimento local).'))
            if not inspect(connection).has_table('alembic_version'):
                print('Banco acessível, mas as migrações da VERBA.X ainda não foram aplicadas.')
                return 2
            script_cfg = Config()
            script_cfg.set_main_option('script_location', str(ROOT / 'backend' / 'migrations'))
            expected = ScriptDirectory.from_config(script_cfg).get_current_head()
            revisions = connection.execute(text('SELECT version_num FROM alembic_version')).scalars().all()
            if revisions != [expected]:
                print('Migrações pendentes. Execute alembic upgrade head conforme docs/SUPABASE.md.')
                return 2
            print('Migrações: atualizadas.')
            return 0
    finally:
        engine.dispose()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print('Não foi possível validar o banco. Confira DATABASE_URL, senha codificada, projeto ativo e TLS no .env. Nenhuma credencial foi exibida.')
        sys.exit(1)

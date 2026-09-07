"""Protect the server-managed domain from Supabase's public Data API."""
from alembic import op

revision = '0002'
down_revision = '0001'

# Frozen list: future model changes must not change an already applied migration.
TABLES = (
    'organizacoes', 'usuarios', 'empregados', 'empregadores', 'casos',
    'documentos', 'registros_salariais', 'periodos_aquisitivos', 'regras_versionadas',
    'resultados_calculo', 'divergencias', 'assinaturas', 'pagamentos', 'sessoes',
    'reset_senha', 'audit_logs', 'webhook_events', 'rate_limits', 'solicitacoes',
    'alembic_version',
)


def upgrade():
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
        # No browser policies: auth/tenant isolation is enforced by FastAPI.
        # The backend connects as the owner; this is also compatible with plain PG.
        op.execute(f'REVOKE ALL ON TABLE "{table}" FROM PUBLIC')
        op.execute(f"""DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON TABLE "{table}" FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON TABLE "{table}" FROM authenticated;
            END IF;
        END $$""")


def downgrade():
    raise RuntimeError('A proteção de dados não pode ser removida automaticamente.')

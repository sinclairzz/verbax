"""Initial tenant-scoped, encrypted VERBA.X domain schema."""
from alembic import op
from app.db import Base

revision = '0001'
down_revision = None


def upgrade():
    Base.metadata.create_all(bind=op.get_bind())
    # Calculation records and published rules cannot be silently changed.
    op.execute("""CREATE FUNCTION verba_immutable_record() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'Registro imutável: crie uma nova versão'; END;
    $$ LANGUAGE plpgsql""")
    op.execute('CREATE TRIGGER immutable_result BEFORE UPDATE ON resultados_calculo FOR EACH ROW EXECUTE FUNCTION verba_immutable_record()')
    op.execute('CREATE TRIGGER immutable_rule BEFORE UPDATE OR DELETE ON regras_versionadas FOR EACH ROW EXECUTE FUNCTION verba_immutable_record()')


def downgrade():
    raise RuntimeError('Migração inicial não pode apagar dados automaticamente. Restaure um backup revisado.')

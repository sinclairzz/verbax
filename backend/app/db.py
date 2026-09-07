import json
import uuid
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint, ForeignKeyConstraint, CheckConstraint, Integer, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.types import TypeDecorator
from .config import settings
from .database import database_engine


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid.uuid4())


class Encrypted(TypeDecorator):
    """Authenticated encryption for personal, labor and financial fields at rest."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        raw = json.dumps(value, ensure_ascii=False, default=str).encode()
        return Fernet(settings().encryption_key.encode()).encrypt(raw).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(Fernet(settings().encryption_key.encode()).decrypt(value.encode()))


class Base(DeclarativeBase):
    pass


class Entity:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class TenantEntity(Entity):
    organizacao_id: Mapped[str] = mapped_column(ForeignKey('organizacoes.id', ondelete='CASCADE'), index=True)


class Organizacao(Entity, Base):
    __tablename__ = 'organizacoes'
    nome: Mapped[str] = mapped_column(Encrypted)


class Usuario(TenantEntity, Base):
    __tablename__ = 'usuarios'
    __table_args__ = (UniqueConstraint('organizacao_id', 'id'), CheckConstraint("modo IN ('trabalhador','advogado','contador')"))
    nome: Mapped[str] = mapped_column(Encrypted)
    email: Mapped[str] = mapped_column(Encrypted)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True)
    senha_hash: Mapped[str] = mapped_column(Text)
    modo: Mapped[str] = mapped_column(String(20), default='trabalhador')
    termos_versao: Mapped[str] = mapped_column(String(30), default='2026-09-07')
    termos_aceitos_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Empregado(TenantEntity, Base):
    __tablename__ = 'empregados'
    __table_args__ = (UniqueConstraint('organizacao_id', 'id'),)
    nome: Mapped[str] = mapped_column(Encrypted)
    cpf: Mapped[str] = mapped_column(Encrypted)


class Empregador(TenantEntity, Base):
    __tablename__ = 'empregadores'
    __table_args__ = (UniqueConstraint('organizacao_id', 'id'),)
    dados: Mapped[dict] = mapped_column(Encrypted)


class Caso(TenantEntity, Base):
    __tablename__ = 'casos'
    __table_args__ = (
        UniqueConstraint('organizacao_id', 'id'),
        ForeignKeyConstraint(['organizacao_id','usuario_id'], ['usuarios.organizacao_id','usuarios.id'], ondelete='CASCADE'),
        ForeignKeyConstraint(['organizacao_id','empregado_id'], ['empregados.organizacao_id','empregados.id']),
        ForeignKeyConstraint(['organizacao_id','empregador_id'], ['empregadores.organizacao_id','empregadores.id']),
    )
    usuario_id: Mapped[str] = mapped_column(String(36))
    empregado_id: Mapped[str] = mapped_column(String(36))
    empregador_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    dados: Mapped[dict] = mapped_column(Encrypted)
    resumo: Mapped[dict] = mapped_column(Encrypted)


class CaseEntity(TenantEntity):
    caso_id: Mapped[str] = mapped_column(String(36), index=True)


def case_fk():
    return (ForeignKeyConstraint(['organizacao_id','caso_id'], ['casos.organizacao_id','casos.id'], ondelete='CASCADE'),)


class Documento(CaseEntity, Base):
    __tablename__ = 'documentos'
    __table_args__ = case_fk()
    dados: Mapped[dict] = mapped_column(Encrypted)
    status: Mapped[str] = mapped_column(String(30), default='pendente')


class RegistroSalarial(CaseEntity, Base):
    __tablename__ = 'registros_salariais'
    __table_args__ = case_fk()
    dados: Mapped[dict] = mapped_column(Encrypted)


class PeriodoAquisitivo(CaseEntity, Base):
    __tablename__ = 'periodos_aquisitivos'
    __table_args__ = case_fk()
    dados: Mapped[dict] = mapped_column(Encrypted)


class RegraVersionada(Entity, Base):
    __tablename__ = 'regras_versionadas'
    __table_args__ = (UniqueConstraint('nome','versao'),)
    nome: Mapped[str] = mapped_column(String(80))
    versao: Mapped[str] = mapped_column(String(40))
    data_publicacao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    formula: Mapped[str] = mapped_column(Text)
    fundamento: Mapped[str] = mapped_column(Text)
    fonte_url: Mapped[str] = mapped_column(Text)


class ResultadoCalculo(CaseEntity, Base):
    __tablename__ = 'resultados_calculo'
    __table_args__ = case_fk() + (UniqueConstraint('caso_id','verba'),)
    verba: Mapped[str] = mapped_column(String(40))
    valor: Mapped[str] = mapped_column(Encrypted)
    formula: Mapped[str] = mapped_column(Text)
    parametros: Mapped[dict] = mapped_column(Encrypted)
    fundamento: Mapped[str] = mapped_column(Text)
    versao_regra: Mapped[str] = mapped_column(String(40))
    data_calculo: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    snapshot_entrada: Mapped[dict] = mapped_column(Encrypted)
    nivel_confianca: Mapped[str] = mapped_column(String(30))
    regra_id: Mapped[str] = mapped_column(ForeignKey('regras_versionadas.id'))


class Divergencia(CaseEntity, Base):
    __tablename__ = 'divergencias'
    __table_args__ = case_fk()
    verba: Mapped[str] = mapped_column(String(40))
    valor_pago: Mapped[str | None] = mapped_column(Encrypted, nullable=True)
    valor_devido: Mapped[str] = mapped_column(Encrypted)
    diferenca: Mapped[str | None] = mapped_column(Encrypted, nullable=True)


class Assinatura(TenantEntity, Base):
    __tablename__ = 'assinaturas'
    __table_args__ = (ForeignKeyConstraint(['organizacao_id','usuario_id'], ['usuarios.organizacao_id','usuarios.id'], ondelete='CASCADE'),)
    usuario_id: Mapped[str] = mapped_column(String(36), unique=True)
    plano: Mapped[str] = mapped_column(String(20), default='gratis')
    status: Mapped[str] = mapped_column(String(30), default='free')
    gateway_customer_id: Mapped[str | None] = mapped_column(String(100))
    gateway_subscription_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    proxima_cobranca: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acesso_ate: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelar_ao_final: Mapped[bool] = mapped_column(Boolean, default=False)
    caso_avulso_id: Mapped[str | None] = mapped_column(String(36))


class Pagamento(TenantEntity, Base):
    __tablename__ = 'pagamentos'
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    plano: Mapped[str] = mapped_column(String(20))
    caso_id: Mapped[str | None] = mapped_column(String(36))
    checkout_id: Mapped[str | None] = mapped_column(String(150), unique=True)
    checkout_url: Mapped[str | None] = mapped_column(Encrypted)
    payment_intent_id: Mapped[str | None] = mapped_column(String(150), unique=True)
    subscription_id: Mapped[str | None] = mapped_column(String(150))
    refund_id: Mapped[str | None] = mapped_column(String(150))
    valor_centavos: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default='pending')
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refund_solicitado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sandbox: Mapped[bool] = mapped_column(Boolean, default=True)


class Sessao(Entity, Base):
    __tablename__ = 'sessoes'
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id', ondelete='CASCADE'), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ResetSenha(Entity, Base):
    __tablename__ = 'reset_senha'
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id', ondelete='CASCADE'))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Entity, Base):
    __tablename__ = 'audit_logs'
    # No CPF, IP in cleartext, request bodies, credentials or financial values.
    organizacao_id: Mapped[str | None] = mapped_column(String(36), index=True)
    usuario_id: Mapped[str | None] = mapped_column(String(36))
    acao: Mapped[str] = mapped_column(String(80))
    recurso_id: Mapped[str | None] = mapped_column(String(100))
    versao: Mapped[str | None] = mapped_column(String(40))


class WebhookEvent(Base):
    __tablename__ = 'webhook_events'
    id: Mapped[str] = mapped_column(String(150), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(100))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class RateLimit(Base):
    __tablename__ = 'rate_limits'
    chave: Mapped[str] = mapped_column(String(100), primary_key=True)
    quantidade: Mapped[int] = mapped_column(Integer, default=0)
    janela: Mapped[int] = mapped_column(Integer)


class Solicitation(TenantEntity, Base):
    __tablename__ = 'solicitacoes'
    usuario_id: Mapped[str] = mapped_column(ForeignKey('usuarios.id', ondelete='CASCADE'))
    tipo: Mapped[str] = mapped_column(String(30))
    mensagem: Mapped[str] = mapped_column(Encrypted)
    status: Mapped[str] = mapped_column(String(30), default='recebida')


engine = database_engine(settings().database_url)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with SessionLocal() as db:
        yield db

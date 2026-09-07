"""Run daily. Deletes only expired credentials, old audit entries and stale dev mail."""
from datetime import timedelta
from pathlib import Path
from sqlalchemy import delete
from app.db import SessionLocal, Sessao, ResetSenha, AuditLog, RateLimit, now
import time

with SessionLocal.begin() as db:
    db.execute(delete(Sessao).where(Sessao.expira_em < now()))
    db.execute(delete(ResetSenha).where(ResetSenha.expira_em < now()))
    db.execute(delete(AuditLog).where(AuditLog.criado_em < now()-timedelta(days=180)))
    db.execute(delete(RateLimit).where(RateLimit.janela < int(time.time())//900 - 2))
folder = Path('.data/mailbox').resolve()
if folder.exists() and folder.is_relative_to(Path('.data').resolve()):
    for message in folder.glob('*.eml.enc'):
        if message.stat().st_mtime < time.time()-86400:
            message.unlink()
print('Manutenção concluída: somente registros e mensagens temporárias vencidos.')

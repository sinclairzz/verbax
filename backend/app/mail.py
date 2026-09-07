from email.message import EmailMessage
from pathlib import Path
import smtplib
import ssl
import secrets
from .config import settings


def send_reset(email: str, token: str):
    config = settings()
    message = EmailMessage()
    message['Subject'] = 'Redefina sua senha - VERBA.X'
    message['From'] = config.email_from or 'desenvolvimento@verba.invalid'
    message['To'] = email
    # Fragment avoids leaking reset tokens to server/access logs and referrers.
    link = f'{config.app_url}/redefinir-senha#token={token}'
    message.set_content(f'Você solicitou uma nova senha da VERBA.X.\n\n{link}\n\nO link expira em 30 minutos e só pode ser usado uma vez. Se não foi você, ignore este e-mail.')
    if config.smtp_host:
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=15) as smtp:
            if config.smtp_tls:
                smtp.starttls(context=ssl.create_default_context())
            if config.smtp_user:
                smtp.login(config.smtp_user, config.smtp_password)
            smtp.send_message(message)
    elif config.environment != 'production':
        # Development mailbox only, encrypted on disk; never returned by a public API.
        from cryptography.fernet import Fernet
        folder = Path('.data/mailbox')
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f'{secrets.token_hex(12)}.eml.enc').write_bytes(Fernet(config.encryption_key.encode()).encrypt(message.as_bytes()))
    else:
        raise RuntimeError('SMTP não configurado')

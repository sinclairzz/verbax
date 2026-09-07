"""Create local development secrets exactly once. Never prints secret values."""
from pathlib import Path
import secrets
from cryptography.fernet import Fernet

root = Path(__file__).resolve().parents[1]
target = root / '.env'
if target.exists():
    print('.env existente preservado.')
else:
    content = (root / '.env.example').read_text(encoding='utf-8')
    content = content.replace('GENERATE_FERNET_KEY', Fernet.generate_key().decode())
    content = content.replace('GENERATE_RANDOM_SECRET', secrets.token_hex(32))
    target.write_text(content, encoding='utf-8')
    print('.env local criado com chaves aleatórias. Não versionar.')

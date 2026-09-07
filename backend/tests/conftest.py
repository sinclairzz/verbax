"""Every test uses an isolated PostgreSQL schema, never the development tables."""
import os
import re
import uuid
from pathlib import Path
import psycopg
import pytest
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv(Path(__file__).resolve().parents[2] / '.env')
BASE_URL = os.environ['DATABASE_URL']
SCHEMA = 'verba_test_' + uuid.uuid4().hex
base = make_url(BASE_URL)
connection_args = dict(host=base.host,port=base.port or 5432,user=base.username,password=base.password,dbname=base.database)
with psycopg.connect(**connection_args,autocommit=True) as conn:
    conn.execute(psycopg.sql.SQL('CREATE SCHEMA {}').format(psycopg.sql.Identifier(SCHEMA)))
os.environ['DATABASE_URL'] = base.update_query_dict({'options':f'-csearch_path={SCHEMA}'}).render_as_string(hide_password=False)
os.environ['ENVIRONMENT'] = 'test'
os.environ['STRIPE_SECRET_KEY'] = 'sk_test_unit_not_a_real_key'
os.environ['STRIPE_WEBHOOK_SECRET'] = 'whsec_unit_test_only'

from app.main import app
from app.db import Base, engine, SessionLocal, Organizacao, RateLimit
from fastapi.testclient import TestClient
from sqlalchemy import delete, text


@pytest.fixture(scope='session',autouse=True)
def schema():
    from alembic.config import Config
    from alembic import command
    command.upgrade(Config('backend/alembic.ini'),'head')
    yield
    engine.dispose()
    # The only schema eligible for destruction is the unique one made above.
    assert re.fullmatch(r'verba_test_[0-9a-f]{32}',SCHEMA)
    assert SCHEMA != 'public'
    with psycopg.connect(**connection_args,autocommit=True) as conn:
        conn.execute(psycopg.sql.SQL('DROP SCHEMA {} CASCADE').format(psycopg.sql.Identifier(SCHEMA)))


@pytest.fixture
def client():
    with TestClient(app,base_url='http://localhost:3000') as client:
        token = client.get('/auth/csrf').json()['token']
        client.headers.update({'x-csrf-token':token,'origin':'http://localhost:3000'})
        yield client
    with SessionLocal.begin() as db:
        db.execute(delete(Organizacao))
        db.execute(delete(RateLimit))


@pytest.fixture
def registered(client):
    credentials = {'nome':'Pessoa de Teste','email':f'teste-{uuid.uuid4().hex}@example.com','senha':'Senha-testavel-123','aceite':True}
    response=client.post('/auth/register',json=credentials)
    assert response.status_code==201,response.text
    return client,credentials,response.json()


@pytest.fixture
def input_data():
    return dict(salario_base='3000.00',dias_no_mes=30,dias_trabalhados=12,anos_completos=5,
        meses_periodo=6,meses_no_ano=4,total_fgts_depositado='10000.00',valor_pago='8500.00')


@pytest.fixture
def case_data(input_data):
    return dict(nome='Pessoa de Teste',cpf='52998224725',cargo='Assistente',empregador='Empresa de teste',
        admissao='2021-01-10',demissao='2026-04-12',calculo=input_data)

# Conectar a VERBA.X ao Supabase

A integração usa o PostgreSQL gerenciado do Supabase. O navegador continua chamando
`/api` no Next.js, que encaminha ao FastAPI; o FastAPI consulta o banco por SQLAlchemy.
O motor de cálculo, as sessões e o login Argon2 existentes são preservados.
Não é necessário instalar `supabase-js` nem fornecer chaves `anon`/`service_role`.
Supabase Auth, Storage e Realtime são integrações separadas, ainda não implementadas.

## 1. Configuração local

Na raiz, com Python e Node instalados:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe scripts/bootstrap.py
npm ci
```

O bootstrap cria `.env` com chaves aleatórias e preserva o arquivo se ele já existir.
Nunca versione `.env`. Preserve `ENCRYPTION_KEY` e `LOOKUP_SECRET` ao mudar de banco:
os dados cifrados e a localização das contas dependem dessas mesmas chaves.
Se este projeto já tiver dados reais, reutilize as chaves do backend existente.

## 2. Escolha o projeto e a conexão

No painel do seu projeto Supabase, abra **Connect → Session pooler** e copie a URI.
Esse modo usa a porta 5432 e funciona em redes IPv4, incluindo o ambiente local.
Preencha a senha do **banco** e cole a URI em `DATABASE_URL` no `.env` local:

```dotenv
DATABASE_URL=postgresql://postgres.PROJECT_REF:SENHA_CODIFICADA@HOST_COPIADO_DO_CONNECT:5432/postgres?sslmode=require
DATABASE_MIGRATION_URL=
```

Use exatamente o host e o usuário mostrados em Connect. Caracteres especiais da
senha devem ser codificados para URL (`@` → `%40`, `#` → `%23`, `%` → `%25`).
Não envie essa URI no chat, em screenshots ou para variáveis `NEXT_PUBLIC_*`.
Uma URL `https://PROJECT_REF.supabase.co` identifica o projeto, mas não conecta
SQLAlchemy ao PostgreSQL. Ela e as chaves da Data API não substituem a URI do banco.

Conexão direta (porta 5432) também funciona se o host tiver IPv6. Se o runtime usar
o Transaction pooler (6543), o código usa `NullPool` e desliga prepared statements;
configure `DATABASE_MIGRATION_URL` com uma URI direta ou Session pooler para Alembic.

## 3. Verifique e aplique as migrações

```powershell
.\.venv\Scripts\python.exe scripts/check_database.py
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
.\.venv\Scripts\python.exe scripts/check_database.py
```

A primeira verificação é somente leitura. Código de saída 0 = conectado e atualizado;
2 = conectado com migrações pendentes; 1 = falha de conexão/configuração.
A migração 0001 cria as tabelas, índices e gatilhos de imutabilidade. A 0002 habilita
RLS nas tabelas da aplicação e remove acesso dos papéis `anon` e `authenticated`.
Como a autenticação é própria, o backend conecta como proprietário das tabelas,
e faz o isolamento por organização/usuário. Não há políticas para leitura pelo navegador.

Use um banco vazio ou um projeto onde o schema da VERBA.X já esteja gerenciado pelo
Alembic. Se existirem tabelas com os mesmos nomes criadas por outra aplicação, revise
o schema antes de migrar. Não use `alembic stamp` para disfarçar essa divergência.
Esses comandos criam/atualizam o schema; não transferem registros de outro banco.
Se houver dados a migrar, use um processo de backup/restauração revisado e preserve as chaves.

## 4. Inicie e confira o fluxo

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Em outro terminal:
npm run dev
```

`APP_URL` e `NEXT_PUBLIC_APP_URL` devem apontar para a URL do frontend;
`API_INTERNAL_URL` deve apontar para o backend. Se alterar portas, atualize as três.
Crie uma conta de teste, salve um caso e recarregue o dashboard. As tabelas aparecerão
no Table Editor do Supabase; os campos pessoais e financeiros são cifrados.

## Produção

O Supabase hospeda o banco; o FastAPI ainda precisa de um servidor (por exemplo,
Railway/Render) e o Next.js de hospedagem própria. Configure o backend com a URI do
Supabase e as mesmas chaves de criptografia. No frontend configure `API_INTERNAL_URL`
para o backend e `NEXT_PUBLIC_APP_URL` para o domínio público.
As demais variáveis obrigatórias de produção estão em `.env.example`.

Referências: [conexões PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres),
[SQLAlchemy](https://supabase.com/docs/guides/troubleshooting/using-sqlalchemy-with-supabase-FUqebT),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';

const databaseDir = path.resolve('.data/postgres');
const port = Number(process.env.LOCAL_POSTGRES_PORT || 55432);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('LOCAL_POSTGRES_PORT inválida');
const pg = new EmbeddedPostgres({ databaseDir, user: 'verba', password: 'verba-local-only',
  port, persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
});
if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname='verba'");
if (!result.rowCount) await pg.createDatabase('verba');
await client.end();
console.log(`PostgreSQL local disponível em 127.0.0.1:${port}. Dados persistem em .data/postgres.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 60000);

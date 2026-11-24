import { db } from './db.ts';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export async function migrate() {
 const client = await db.connect();
 try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(7249101)");
  await client.query('CREATE TABLE IF NOT EXISTS scanner_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const folder = fileURLToPath(new URL('../database/migrations/', import.meta.url));
  for (const file of (await readdir(folder)).filter(f=>f.endsWith('.sql')).sort()) {
   if ((await client.query('SELECT 1 FROM scanner_migrations WHERE id=$1',[file])).rowCount) continue;
   await client.query(await readFile(`${folder}/${file}`, 'utf8'));
   await client.query('INSERT INTO scanner_migrations(id) VALUES($1)', [file]);
  }
  await client.query('COMMIT');
 } catch(e) { await client.query('ROLLBACK'); throw e; } finally {client.release();}
}
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) { await migrate(); console.log('MVP database migrations applied.'); await db.end(); }

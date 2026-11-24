import 'dotenv/config';
import pg from 'pg';
export const db = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://scanner:local_scanner_dev@127.0.0.1:54330/metro_scanner', max: 8 });

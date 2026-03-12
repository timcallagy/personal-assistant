import { Pool } from 'pg';
import { config } from '../config.js';

const BABBLO_DATABASE_URL = process.env['BABBLO_DATABASE_URL'];

if (config.isProduction && !BABBLO_DATABASE_URL) {
  throw new Error('BABBLO_DATABASE_URL is required in production');
}

export const babbloDb = new Pool({
  connectionString: BABBLO_DATABASE_URL || '',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function babbloQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await babbloDb.query(sql, params as unknown[]);
  return result.rows as T[];
}

export async function connectBabbloDb(): Promise<void> {
  if (!BABBLO_DATABASE_URL) {
    console.warn('BABBLO_DATABASE_URL not set — Babblo DB connection skipped');
    return;
  }
  try {
    await babbloDb.query('SELECT 1');
    console.log('Babblo DB connected');
  } catch (error) {
    console.warn('Babblo DB connection failed (non-fatal):', error);
  }
}

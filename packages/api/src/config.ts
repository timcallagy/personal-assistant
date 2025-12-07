import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env['PORT'] || '3001', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  databaseUrl: process.env['DATABASE_URL'] || '',
  sessionSecret: process.env['SESSION_SECRET'] || 'default-secret-change-me',
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
};

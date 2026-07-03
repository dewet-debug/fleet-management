import { existsSync } from 'node:fs';
import path from 'node:path';

// tsx does not auto-load .env, the project has no `dotenv` dependency, and the
// dev script passes no --env-file. Until now, env values only reached
// process.env as a side-effect of Prisma initialising later in the import
// graph -- which is *after* this module reads process.env, so config below was
// silently falling back to defaults. Load server/.env explicitly here, before
// building the config object, using Node's native loader (Node 20.12+/24).
const envPath = path.resolve(__dirname, '../../.env');
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath);
}

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  JWT_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',

  // Cartrack API
  CARTRACK_API_BASE_URL: process.env.CARTRACK_API_BASE_URL || 'https://fleetapi-za.cartrack.com/rest/',
  CARTRACK_API_USERNAME: process.env.CARTRACK_API_USERNAME || '',
  CARTRACK_API_PASSWORD: process.env.CARTRACK_API_PASSWORD || '',
  CARTRACK_ENCRYPTION_KEY: process.env.CARTRACK_ENCRYPTION_KEY || 'default-encryption-key-change-in-prod',

  // Bolt Fleet Integration (OAuth2 client_credentials against oidc.bolt.eu)
  BOLT_CLIENT_ID: process.env.BOLT_CLIENT_ID || '',
  BOLT_CLIENT_SECRET: process.env.BOLT_CLIENT_SECRET || '',
  BOLT_OIDC_TOKEN_URL: process.env.BOLT_OIDC_TOKEN_URL || 'https://oidc.bolt.eu/token',
  BOLT_OAUTH_SCOPE: process.env.BOLT_OAUTH_SCOPE || 'fleet-integration:api',
};

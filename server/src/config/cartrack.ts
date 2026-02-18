import { env } from './env';

export const cartrackConfig = {
  apiBaseUrl: env.CARTRACK_API_BASE_URL,
  apiUsername: env.CARTRACK_API_USERNAME,
  apiPassword: env.CARTRACK_API_PASSWORD,
  encryptionKey: env.CARTRACK_ENCRYPTION_KEY,
};

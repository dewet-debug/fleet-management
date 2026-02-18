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
};

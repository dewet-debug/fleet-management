export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
  JWT_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

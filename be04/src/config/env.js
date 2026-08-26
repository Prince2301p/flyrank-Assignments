require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  STORAGE_TYPE: (process.env.STORAGE_TYPE || 'postgres').toLowerCase(),
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/taskdb',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

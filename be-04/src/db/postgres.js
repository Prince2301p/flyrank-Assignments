const { Pool } = require('pg');
const config = require('../config/env');

let pool = null;

function getPool(customConnectionString) {
  if (!pool) {
    const connectionString = customConnectionString || config.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

async function checkConnection() {
  let client = null;
  try {
    const currentPool = getPool();
    client = await currentPool.connect();
    const res = await client.query('SELECT NOW() AS current_time');
    return { connected: true, timestamp: res.rows[0].current_time };
  } catch (err) {
    return { connected: false, error: err.message };
  } finally {
    if (client) client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  checkConnection,
  closePool
};

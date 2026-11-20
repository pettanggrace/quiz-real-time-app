const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

let hasLoggedConnect = false;
pool.on('connect', () => {
  if (!hasLoggedConnect) {
    console.log('Connecté à la base de données Neon Postgres');
    hasLoggedConnect = true;
  }
});

pool.on('error', (err) => {
  console.error('Erreur de connexion à la base de données:', err.message);
});

// Keep-alive periodique pour éviter les timeouts
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('Keep-alive query failed:', err.message);
  }
}, 30000);

module.exports = pool;

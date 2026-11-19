const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connecté à la base de données Neon Postgres');
});

pool.on('error', (err) => {
  console.error('Erreur de connexion à la base de données:', err);
});

module.exports = pool;

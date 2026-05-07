require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 5_000,
  query_timeout: 5_000,
  idle_in_transaction_session_timeout: 10_000
})

pool.on('error', (err) => {
  console.error('Erreur pool Postgres (idle client):', err.message)
})

module.exports = pool

#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

(async () => {
  let pool;
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      connectionLimit: 1,
    });
    const [rows] = await pool.query(
      "SELECT id FROM articles WHERE DATE(published_at)=CURDATE() ORDER BY id DESC LIMIT 1"
    );
    console.log(rows[0].id);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('ERROR: ' + (e.message || e));
    process.exit(1);
  }
})();

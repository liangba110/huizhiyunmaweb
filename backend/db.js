const mysql = require('mysql2/promise');
require('dotenv').config();

// 主站数据库
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// 支付系统数据库（模板商城使用）
const payPool = mysql.createPool({
  host: process.env.PAY_DB_HOST || process.env.DB_HOST,
  port: process.env.PAY_DB_PORT || process.env.DB_PORT,
  user: process.env.PAY_DB_USER || 'pay_system',
  password: process.env.PAY_DB_PASSWORD || 'PaySystem@2026',
  database: process.env.PAY_DB_NAME || 'pay_system_db',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
});

module.exports = pool;
module.exports.payPool = payPool;
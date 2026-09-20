#!/usr/bin/env node
/**
 * 汇智云码科技 - 查询今日已发布 SEO 文章数量
 * 用法：node count_today.js
 * 输出：今日已发布篇数（0-3），按数据库当天 published_at 统计
 */
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
      "SELECT COUNT(*) AS c FROM articles WHERE DATE(published_at)=CURDATE()"
    );
    console.log(rows[0].c);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('COUNT_ERROR: ' + (e.message || e));
    process.exit(1);
  }
})();

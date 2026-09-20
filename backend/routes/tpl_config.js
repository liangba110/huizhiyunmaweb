const router = require('express').Router();
const { payPool: pool } = require('../db');
const auth = require('../middleware/auth');

// 公开：读取配置（收款码、网站名称等）
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT config_key, config_value FROM company_config');
    const data = {};
    rows.forEach(r => { data[r.config_key] = r.config_value; });
    res.json({ code: 0, data });
  } catch (e) { next(e); }
});

// 管理：更新配置
router.put('/', auth, async (req, res, next) => {
  try {
    const items = req.body || {};
    for (const [k, v] of Object.entries(items)) {
      await pool.query('INSERT INTO company_config (config_key, config_value) VALUES (?,?) ON DUPLICATE KEY UPDATE config_value=VALUES(config_value)', [k, String(v)]);
    }
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;

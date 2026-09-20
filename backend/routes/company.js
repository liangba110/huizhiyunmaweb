const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT item_key, item_value FROM company_info ORDER BY sort_order ASC');
    const data = {};
    rows.forEach(r => { data[r.item_key] = r.item_value; });
    res.json({ code: 0, data });
  } catch (e) { next(e); }
});

router.put('/', auth, async (req, res, next) => {
  try {
    const items = req.body || {};
    for (const [k, v] of Object.entries(items)) {
      await pool.query(
        'INSERT INTO company_info (item_key, item_value) VALUES (?,?) ON DUPLICATE KEY UPDATE item_value=VALUES(item_value)',
        [k, String(v)]
      );
    }
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;
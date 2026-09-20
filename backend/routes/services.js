const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// 公开：服务列表
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM services WHERE status = 1 ORDER BY sort_order DESC, id ASC'
    );
    res.json({ code: 0, data: rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// 管理
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, subtitle, description, icon, features, price_min, price_max, sort_order } = req.body;
    const [r] = await pool.query(
      'INSERT INTO services (title, subtitle, description, icon, features, price_min, price_max, sort_order) VALUES (?,?,?,?,?,?,?,?)',
      [title, subtitle, description, icon, features, price_min, price_max, sort_order || 0]
    );
    res.json({ code: 0, data: { id: r.insertId } });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, subtitle, description, icon, features, price_min, price_max, sort_order, status } = req.body;
    await pool.query(
      'UPDATE services SET title=?, subtitle=?, description=?, icon=?, features=?, price_min=?, price_max=?, sort_order=?, status=? WHERE id=?',
      [title, subtitle, description, icon, features, price_min, price_max, sort_order, status, req.params.id]
    );
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;
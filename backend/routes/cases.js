const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// 公开：案例列表
router.get('/', async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 12 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +pageSize;
    const where = ['status = 1'];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    const whereSql = where.join(' AND ');
    const [rows] = await pool.query(
      `SELECT id, title, client, category, cover_image, description, technologies, project_url, view_count, created_at FROM cases WHERE ${whereSql} ORDER BY sort_order DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, +pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM cases WHERE ${whereSql}`,
      params
    );
    res.json({ code: 0, data: { list: rows, total, page: +page, pageSize: +pageSize } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cases WHERE id = ? AND status = 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '不存在' });
    await pool.query('UPDATE cases SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// 管理
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, client, category, cover_image, description, content, technologies, project_url, sort_order } = req.body;
    const [r] = await pool.query(
      'INSERT INTO cases (title, client, category, cover_image, description, content, technologies, project_url, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [title, client, category, cover_image, description, content, technologies, project_url, sort_order || 0]
    );
    res.json({ code: 0, data: { id: r.insertId } });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, client, category, cover_image, description, content, technologies, project_url, sort_order, status } = req.body;
    await pool.query(
      'UPDATE cases SET title=?, client=?, category=?, cover_image=?, description=?, content=?, technologies=?, project_url=?, sort_order=?, status=? WHERE id=?',
      [title, client, category, cover_image, description, content, technologies, project_url, sort_order, status, req.params.id]
    );
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cases WHERE id = ?', [req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;
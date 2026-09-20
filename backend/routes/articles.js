const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// 公开
router.get('/', async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 10 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +pageSize;
    const where = ['status = 1'];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    const whereSql = where.join(' AND ');
    const [rows] = await pool.query(
      `SELECT id, title, category, cover_image, summary, author, view_count, is_top, published_at, created_at FROM articles WHERE ${whereSql} ORDER BY is_top DESC, published_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, +pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articles WHERE ${whereSql}`,
      params
    );
    res.json({ code: 0, data: { list: rows, total, page: +page, pageSize: +pageSize } });
  } catch (e) { next(e); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT category, COUNT(*) AS count FROM articles WHERE status = 1 AND category IS NOT NULL AND category != \'\' GROUP BY category ORDER BY count DESC'
    );
    res.json({ code: 0, data: rows });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ? AND status = 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '不存在' });
    await pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    // 获取相关推荐（同分类优先，排除当前文章，取3篇）
    const article = rows[0];
    const [sameCat] = await pool.query(
      'SELECT id, title, category, summary, cover_image FROM articles WHERE status = 1 AND id != ? AND category = ? ORDER BY published_at DESC LIMIT 3',
      [req.params.id, article.category]
    );
    let related = sameCat;
    if (related.length < 3) {
      const [diffCat] = await pool.query(
        'SELECT id, title, category, summary, cover_image FROM articles WHERE status = 1 AND id != ? AND category != ? ORDER BY published_at DESC LIMIT ?',
        [req.params.id, article.category, 3 - related.length]
      );
      related = [...related, ...diffCat];
    }

    res.json({ code: 0, data: { ...article, related } });
  } catch (e) { next(e); }
});

// 管理
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, category, cover_image, summary, content, author, is_top, published_at } = req.body;
    const [r] = await pool.query(
      'INSERT INTO articles (title, category, cover_image, summary, content, author, is_top, published_at) VALUES (?,?,?,?,?,?,?,?)',
      [title, category, cover_image, summary, content, author || '汇智云码', is_top || 0, published_at || new Date()]
    );
    res.json({ code: 0, data: { id: r.insertId } });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, category, cover_image, summary, content, author, is_top, status, published_at } = req.body;
    await pool.query(
      'UPDATE articles SET title=?, category=?, cover_image=?, summary=?, content=?, author=?, is_top=?, status=?, published_at=? WHERE id=?',
      [title, category, cover_image, summary, content, author, is_top, status, published_at, req.params.id]
    );
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;
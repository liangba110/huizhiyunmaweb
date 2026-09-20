const router = require('express').Router();
const { payPool: pool } = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function genOrderNo() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TMP${date}${rand}`;
}

// 公开：模板列表
router.get('/', async (req, res, next) => {
  try {
    const { category, level } = req.query;
    const where = ['status = 1'];
    const params = [];
    if (category) { where.push('category = ?'); params.push(category); }
    if (level) { where.push('level = ?'); params.push(level); }
    const [rows] = await pool.query(`SELECT id, name, slug, description, features, preview_images, demo_url, category, level, price, download_count, sort_order, created_at FROM templates WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id DESC`, params);
    rows.forEach(r => {
      if (r.features) try { r.features = JSON.parse(r.features); } catch(e) { r.features = []; }
      if (r.preview_images) r.preview_images = r.preview_images.split(',').filter(Boolean);
      else r.preview_images = [];
    });
    res.json({ code: 0, data: rows });
  } catch (e) { next(e); }
});

// 公开：单个模板详情
router.get('/:slug', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM templates WHERE slug = ? AND status = 1', [req.params.slug]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '模板不存在' });
    const r = rows[0];
    if (r.features) try { r.features = JSON.parse(r.features); } catch(e) { r.features = []; }
    if (r.preview_images) r.preview_images = r.preview_images.split(',').filter(Boolean);
    else r.preview_images = [];
    r.status = undefined;
    res.json({ code: 0, data: r });
  } catch (e) { next(e); }
});

// 公开：创建订单
router.post('/:slug/purchase', async (req, res, next) => {
  try {
    const [tpls] = await pool.query('SELECT id, name, price, level, download_url FROM templates WHERE slug = ? AND status = 1', [req.params.slug]);
    if (tpls.length === 0) return res.status(404).json({ code: -1, message: '模板不存在' });
    const tpl = tpls[0];
    const { customer_name, customer_phone, customer_email, customer_remark } = req.body;
    if (!customer_name || !customer_phone) return res.status(400).json({ code: -1, message: '请填写姓名和手机号' });
    const orderNo = genOrderNo();
    await pool.query(
      'INSERT INTO template_orders (order_no, template_id, template_name, level, amount, customer_name, customer_phone, customer_email, customer_remark, status) VALUES (?,?,?,?,?,?,?,?,?,0)',
      [orderNo, tpl.id, tpl.name, tpl.level, tpl.price, customer_name, customer_phone, customer_email, customer_remark]
    );
    res.json({ code: 0, data: {
      order_no: orderNo,
      template_name: tpl.name,
      amount: tpl.price,
      level: tpl.level,
      status: 0
    }});
  } catch (e) { next(e); }
});

// 公开：已确认的订单可下载（必须在 /order/:orderNo 之前）
router.get('/order/:orderNo/download', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT t.download_url, o.template_id, o.status FROM template_orders o JOIN templates t ON o.template_id = t.id WHERE o.order_no = ?', [req.params.orderNo]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    if (rows[0].status < 2) return res.status(400).json({ code: -1, message: '订单尚未确认' });
    if (!rows[0].download_url) return res.status(400).json({ code: -1, message: '下载文件暂未上传' });
    await pool.query('UPDATE templates SET download_count = download_count + 1 WHERE id = ?', [rows[0].template_id]);
    res.json({ code: 0, data: { download_url: rows[0].download_url } });
  } catch (e) { next(e); }
});

// 公开：查询订单状态（必须放在 /order/:orderNo/download 后面，避免覆盖）
router.get('/order/:orderNo', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT order_no, template_name, amount, level, status, pay_method, created_at, paid_at, confirmed_at FROM template_orders WHERE order_no = ?', [req.params.orderNo]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    const statusText = { 0: '待支付', 1: '待确认', 2: '已完成', '-1': '已取消' };
    rows[0].status_text = statusText[rows[0].status] || '未知';
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// ========== 以下为管理后台接口 ==========

router.get('/admin/list', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, slug, level, price, description, features, preview_images, demo_url, download_url, category, download_count, sort_order, status, created_at, updated_at FROM templates ORDER BY sort_order ASC, id DESC');
    rows.forEach(r => {
      if (r.features && typeof r.features === 'string') try { r.features = JSON.parse(r.features); } catch(e) { r.features = []; }
      if (r.preview_images && typeof r.preview_images === 'string') r.preview_images = r.preview_images.split(',').filter(Boolean);
      else r.preview_images = [];
    });
    res.json({ code: 0, data: rows });
  } catch (e) { next(e); }
});

router.post('/admin/save', auth, async (req, res, next) => {
  try {
    const { id, name, slug, level, price, description, features, preview_images, demo_url, download_url, category, sort_order, status } = req.body;
    if (!name || !slug) return res.status(400).json({ code: -1, message: '请填写名称和标识' });
    const f = features ? (Array.isArray(features) ? JSON.stringify(features) : features) : '[]';
    const pi = preview_images ? (Array.isArray(preview_images) ? preview_images.join(',') : preview_images) : '';
    if (id) {
      await pool.query('UPDATE templates SET name=?, slug=?, level=?, price=?, description=?, features=?, preview_images=?, demo_url=?, download_url=?, category=?, sort_order=?, status=? WHERE id=?',
        [name, slug, level, price, description, f, pi, demo_url, download_url, category, sort_order || 0, status ?? 1, id]);
    } else {
      await pool.query('INSERT INTO templates (name,slug,level,price,description,features,preview_images,demo_url,download_url,category,sort_order,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [name, slug, level, price, description, f, pi, demo_url, download_url, category, sort_order || 0, status ?? 1]);
    }
    res.json({ code: 0, message: '保存成功' });
  } catch (e) { next(e); }
});

router.delete('/admin/:id', auth, async (req, res, next) => {
  try { await pool.query('DELETE FROM templates WHERE id = ?', [req.params.id]); res.json({ code: 0, message: '已删除' }); }
  catch (e) { next(e); }
});

router.get('/admin/orders', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, order_no, template_name, level, amount, customer_name, customer_phone, customer_email, customer_remark, pay_method, status, created_at, paid_at, confirmed_at FROM template_orders ORDER BY created_at DESC');
    res.json({ code: 0, data: rows });
  } catch (e) { next(e); }
});

router.put('/admin/order/:id', auth, async (req, res, next) => {
  try {
    const { action } = req.body;
    const id = req.params.id;
    if (action === 'confirm') {
      await pool.query('UPDATE template_orders SET status=2, confirmed_at=NOW() WHERE id=? AND status=1', [id]);
    } else if (action === 'cancel') {
      await pool.query('UPDATE template_orders SET status=-1 WHERE id=? AND status=0', [id]);
    } else {
      return res.status(400).json({ code: -1, message: '无效操作' });
    }
    res.json({ code: 0, message: '操作成功' });
  } catch (e) { next(e); }
});

module.exports = router;

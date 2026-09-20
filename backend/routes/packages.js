const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendNotify } = require('../mailer');

// 业务类型映射
const BIZ_MAP = {
  website: '网站建设',
  miniapp: '小程序',
  app: 'APP开发'
};

// ============ GET /api/packages 查询套餐列表 ============
// 参数: biz_type(可选) industry(可选) level(可选)
router.get('/', async (req, res) => {
  try {
    const { biz_type, industry, level } = req.query;
    let sql = 'SELECT * FROM service_packages WHERE status=1';
    const params = [];
    if (biz_type) { sql += ' AND biz_type=?'; params.push(biz_type); }
    if (industry && industry !== '通用') { sql += ' AND (industry=? OR industry="通用")'; params.push(industry); }
    if (level) { sql += ' AND level=?'; params.push(level); }
    sql += ' ORDER BY biz_type, FIELD(industry,"电商","餐饮","美容预约","教育","同城服务","通用"), FIELD(level,"basic","pro","flagship"), price';
    const [rows] = await pool.query(sql, params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    console.error('packages err:', e.message);
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ GET /api/packages/industries 行业列表 ============
router.get('/industries', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT industry FROM service_packages WHERE status=1 ORDER BY FIELD(industry,'电商','餐饮','美容预约','教育','同城服务','通用')"
    );
    res.json({ code: 0, data: rows.map(r => r.industry) });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ GET /api/packages/:id 套餐详情 ============
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_packages WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: -1, msg: '套餐不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ POST /api/packages/order 创建套餐订单 ============
router.post('/order', async (req, res) => {
  try {
    const { package_id, name, phone, wechat, remark, pay_method } = req.body;
    if (!package_id) return res.status(400).json({ code: -1, msg: '请选择套餐' });
    if (!phone && !wechat) return res.status(400).json({ code: -1, msg: '请留下电话或微信' });

    // 查套餐
    const [pkgs] = await pool.query('SELECT * FROM service_packages WHERE id=? AND status=1', [package_id]);
    if (pkgs.length === 0) return res.status(404).json({ code: -1, msg: '套餐不存在' });
    const pkg = pkgs[0];

    // 生成订单号
    const orderNo = 'SO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

    // 插入订单
    await pool.query(
      `INSERT INTO package_orders (order_no, package_id, biz_type, industry, package_name, price, name, phone, wechat, remark, pay_method, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,0)`,
      [
        orderNo, pkg.id, pkg.biz_type, pkg.industry, pkg.name, pkg.price,
        name || '', phone || '', wechat || '', remark || '', pay_method || 'wechat'
      ]
    );

    // 邮件通知老板
    const esc = s => String(s || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bizName = BIZ_MAP[pkg.biz_type] || pkg.biz_type;
    sendNotify({
      subject: `🛒 新套餐订单：${esc(name || '客户')} 购买 ${esc(bizName)} - ${esc(pkg.name)}`,
      html: `
        <div style="font-family:Microsoft YaHei,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#059669,#0d9488);padding:16px;color:#fff">
            <h2 style="margin:0;font-size:18px">🛒 新套餐下单通知</h2>
            <div style="font-size:13px;opacity:.9">订单号：${esc(orderNo)}</div>
          </div>
          <div style="padding:20px;font-size:14px;line-height:1.9;color:#1f2937">
            <p><strong>套餐：</strong>${esc(bizName)} - ${esc(pkg.name)}（${esc(pkg.industry)}行业）</p>
            <p><strong>价格：</strong>¥${pkg.price}（原价¥${pkg.original_price}，省${Math.round((1-pkg.price/pkg.original_price)*100)}%）</p>
            <p><strong>客户称呼：</strong>${esc(name || '未留名')}</p>
            <p><strong>联系电话：</strong>${esc(phone || '未提供')}</p>
            <p><strong>微信：</strong>${esc(wechat || '未提供')}</p>
            <p><strong>备注：</strong>${esc(remark || '无')}</p>
            <p><strong>支付方式：</strong>${esc(pay_method === 'wechat' ? '微信' : '支付宝')}</p>
            <p style="color:#94a3b8;font-size:12px">客户已下单，待付款确认。请尽快联系客户收款并安排交付。</p>
            <a href="https://www.openai2000.cn/admin" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px">进入管理后台处理</a>
          </div>
        </div>`
    });

    res.json({ code: 0, msg: '下单成功', order_no: orderNo, package_name: pkg.name, price: pkg.price });
  } catch (e) {
    console.error('order err:', e.message);
    res.status(500).json({ code: -1, msg: '下单失败' });
  }
});

// ============ GET /api/packages/admin/orders 管理后台订单列表 ============
router.get('/admin/orders', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM package_orders ORDER BY id DESC LIMIT 200'
    );
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ PUT /api/packages/admin/orders/:id 更新订单状态 ============
router.put('/admin/orders/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE package_orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ code: 0, msg: '已更新' });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '更新失败' });
  }
});

module.exports = router;

const router = require('express').Router();
const pool = require('../db');            // 主库 huizhiyunma_db
const { payPool } = require('../db');     // 支付库 pay_system_db（模板商城订单）
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sendNotify } = require('../mailer');

// ============ 统一支付网关配置（pay.openai2000.cn，所有支付必须走此网关）============
const WX_APPID = process.env.WX_APPID || 'wxd274e174ddadd4cb';
const WX_SECRET = process.env.WX_SECRET || '';
const PAY_GATEWAY = process.env.PAY_GATEWAY || 'https://pay.openai2000.cn';
const PAY_NOTIFY_TOKEN = process.env.PAY_NOTIFY_TOKEN || ''; // 与网关 _notify_merchant 回调鉴权一致（值从 .env 读取）
const OAUTH_REDIRECT = 'https://www.openai2000.cn/api/payment/oauth/callback';

// 生成订单号（HY 前缀，通用支付订单）
function genOrderNo() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `HY${date}${rand}`;
}

// ============ 订单类型识别（网关回调按订单号前缀路由）============
// TMP=模板商城(pay_system_db) / SO=套餐(huizhiyunma_db) / HY=通用支付(huizhiyunma_db)
function resolveOrder(order_no) {
  if (order_no.startsWith('TMP')) {
    return {
      db: payPool, table: 'template_orders', nameCol: 'template_name',
      amountCol: 'amount', page: 'templates', paidAtCol: 'paid_at',
      subject: o => `模板购买：${o.template_name}`,
    };
  }
  if (order_no.startsWith('SO')) {
    return {
      db: pool, table: 'package_orders', nameCol: 'package_name',
      amountCol: 'price', page: 'packages', paidAtCol: null,
      subject: o => `AI建站服务：${o.package_name}`,
    };
  }
  if (order_no.startsWith('HY')) {
    return {
      db: pool, table: 'payment_orders', nameCol: 'title',
      amountCol: 'amount', page: 'templates', paidAtCol: 'paid_at',
      subject: o => o.title,
    };
  }
  return null;
}

// 从 cookie 解析 openid
function getOpenid(req) {
  const m = /(?:^|;\s*)hz_openid=([^;]+)/.exec(req.headers.cookie || '');
  return m ? decodeURIComponent(m[1]) : '';
}

// ============ 公众号网页授权（snsapi_base 静默拿 openid）============

// GET /api/payment/oauth/url?order_no=xxx → 返回微信授权跳转地址（前端跳转）
router.get('/oauth/url', async (req, res) => {
  const { order_no } = req.query;
  if (!order_no) return res.status(400).json({ code: -1, message: '缺少订单号' });
  const redirect = encodeURIComponent(OAUTH_REDIRECT);
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WX_APPID}&redirect_uri=${redirect}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(order_no)}#wechat_redirect`;
  res.json({ code: 0, data: { url } });
});

// GET /api/payment/oauth/callback?code=xxx&state=order_no → 换 openid 存 cookie，302 回前端支付页
router.get('/oauth/callback', async (req, res) => {
  const { code, state: order_no } = req.query;
  if (!code || !order_no) return res.status(400).send('参数错误');
  try {
    const r = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WX_APPID}&secret=${WX_SECRET}&code=${encodeURIComponent(code)}&grant_type=authorization_code`
    );
    const d = await r.json();
    if (!d.openid) {
      console.error('[oauth] 换取openid失败:', JSON.stringify(d));
      return res.status(500).send('授权失败，请重试');
    }
    const meta = resolveOrder(order_no);
    const page = meta ? meta.page : 'templates';
    res.setHeader('Set-Cookie', `hz_openid=${d.openid}; Path=/; HttpOnly; Max-Age=7200; SameSite=Lax`);
    res.redirect(302, `https://www.openai2000.cn/${page}?pay=${encodeURIComponent(order_no)}`);
  } catch (e) {
    console.error('[oauth] 异常:', e.message);
    res.status(500).send('授权异常');
  }
});

// ============ JSAPI 下单（走统一支付网关）============
// POST /api/payment/jsapi {order_no}
router.post('/jsapi', async (req, res, next) => {
  try {
    const { order_no } = req.body;
    if (!order_no) return res.status(400).json({ code: -1, message: '缺少订单号' });
    const meta = resolveOrder(order_no);
    if (!meta) return res.status(400).json({ code: -1, message: '不支持的订单号' });

    const openid = getOpenid(req);
    if (!openid) return res.status(401).json({ code: -1, message: 'NEED_OAUTH', oauth: true });

    const [rows] = await meta.db.query(`SELECT * FROM ${meta.table} WHERE order_no = ?`, [order_no]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    const order = rows[0];
    if (order.status !== 0) return res.status(400).json({ code: -1, message: '订单状态不允许支付' });

    const amountFen = Math.round(parseFloat(order[meta.amountCol]) * 100);
    if (!(amountFen > 0)) return res.status(400).json({ code: -1, message: '订单金额异常' });
    const subject = meta.subject(order).slice(0, 60);

    // 先查微信侧订单状态（防重复拉起支付 / 已支付未同步）
    let tradeState = '';
    try {
      const qr = await fetch(`${PAY_GATEWAY}/api/v1/wxpay/query?out_trade_no=${order_no}`);
      const qd = await qr.json();
      tradeState = (qd && qd.data && qd.data.trade_state) || '';
    } catch(e) { /* 查询失败不阻断，继续下单 */ }

    if (tradeState === 'SUCCESS') {
      // 微信侧已支付成功：本地同步状态，不重复拉起支付
      if (meta.table === 'template_orders') {
        await meta.db.query(`UPDATE ${meta.table} SET status=1, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`, [order_no]);
      } else if (meta.table === 'package_orders') {
        await meta.db.query(`UPDATE ${meta.table} SET status=1, pay_method='wechat' WHERE order_no=? AND status=0`, [order_no]);
      } else {
        await meta.db.query(`UPDATE ${meta.table} SET status=2, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`, [order_no]);
      }
      return res.json({ code: 0, data: { already_paid: true } });
    }

    // 存在未支付/支付中的旧单 → 先关闭再重新下单（微信 out_trade_no 唯一，避免 OUT_TRADE_NO_USED）
    if (tradeState && ['NOTPAY', 'USERPAYING', 'PAYERROR'].includes(tradeState)) {
      try {
        await fetch(`${PAY_GATEWAY}/api/v1/wxpay/close?out_trade_no=${order_no}`, { method: 'POST' });
      } catch(e) {}
    }

    // 调统一支付网关 JSAPI 下单（网关负责微信 API v3 签名与 prepay 生成）
    const gw = await fetch(`${PAY_GATEWAY}/api/v1/wxpay/jsapi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openid, out_trade_no: order_no, amount: amountFen / 100, subject }),
    });
    const gd = await gw.json();
    if (gd.code !== 0 || !gd.data) {
      return res.status(502).json({ code: -1, message: '支付网关下单失败: ' + (gd.msg || JSON.stringify(gd).slice(0, 200)) });
    }
    res.json({ code: 0, data: gd.data }); // {appId,timeStamp,nonceStr,package,paySign}
  } catch (e) { next(e); }
});

// ============ Native 扫码支付（PC/浏览器通用：页面显示二维码，微信扫码支付）============
// POST /api/payment/native {order_no}
router.post('/native', async (req, res, next) => {
  try {
    const { order_no } = req.body;
    if (!order_no) return res.status(400).json({ code: -1, message: '缺少订单号' });
    const meta = resolveOrder(order_no);
    if (!meta) return res.status(400).json({ code: -1, message: '不支持的订单号' });

    const [rows] = await meta.db.query(`SELECT * FROM ${meta.table} WHERE order_no = ?`, [order_no]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    const order = rows[0];
    if (order.status !== 0) return res.status(400).json({ code: -1, message: '订单状态不允许支付' });

    const amountFen = Math.round(parseFloat(order[meta.amountCol]) * 100);
    if (!(amountFen > 0)) return res.status(400).json({ code: -1, message: '订单金额异常' });
    const subject = meta.subject(order).slice(0, 60);

    // 先查微信侧订单状态（防重复下单 / 已支付未同步）
    let tradeState = '';
    try {
      const qr = await fetch(`${PAY_GATEWAY}/api/v1/wxpay/query?out_trade_no=${order_no}`);
      const qd = await qr.json();
      tradeState = (qd && qd.data && qd.data.trade_state) || '';
    } catch(e) { /* 查询失败不阻断 */ }

    if (tradeState === 'SUCCESS') {
      if (meta.table === 'template_orders') {
        await meta.db.query(`UPDATE ${meta.table} SET status=1, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`, [order_no]);
      } else if (meta.table === 'package_orders') {
        await meta.db.query(`UPDATE ${meta.table} SET status=1, pay_method='wechat' WHERE order_no=? AND status=0`, [order_no]);
      } else {
        await meta.db.query(`UPDATE ${meta.table} SET status=2, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`, [order_no]);
      }
      return res.json({ code: 0, data: { already_paid: true } });
    }

    // 存在未支付/支付中的旧单 → 先关闭再重新下单
    if (tradeState && ['NOTPAY', 'USERPAYING', 'PAYERROR'].includes(tradeState)) {
      try {
        await fetch(`${PAY_GATEWAY}/api/v1/wxpay/close?out_trade_no=${order_no}`, { method: 'POST' });
      } catch(e) {}
    }

    // 调统一支付网关 Native 下单（返回 code_url）
    const gw = await fetch(`${PAY_GATEWAY}/api/v1/wxpay/native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ out_trade_no: order_no, amount: amountFen / 100, subject }),
    });
    const gd = await gw.json();
    if (gd.code !== 0 || !gd.data || !gd.data.code_url) {
      return res.status(502).json({ code: -1, message: '支付网关下单失败: ' + (gd.msg || JSON.stringify(gd).slice(0, 200)) });
    }

    // 生成二维码 dataURL（前端直接 <img> 展示，零外部依赖）
    const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL(gd.data.code_url, { width: 300, margin: 1 });
    res.json({ code: 0, data: { code_url: gd.data.code_url, qr_data_url: qrDataUrl, amount: amountFen / 100 } });
  } catch (e) { next(e); }
});

// ============ 网关支付结果回调（统一支付网关转发，X-Pay-Token 鉴权）============
// POST /api/payment/notify
router.post('/notify', async (req, res) => {
  try {
    if (req.headers['x-pay-token'] !== PAY_NOTIFY_TOKEN) {
      return res.status(403).json({ code: -1, message: '未授权' });
    }
    const { order_no, amount } = req.body;
    if (!order_no) return res.status(400).json({ code: -1, message: '缺少订单号' });
    const meta = resolveOrder(order_no);
    if (!meta) return res.status(400).json({ code: -1, message: '不支持的订单号' });

    const [rows] = await meta.db.query(`SELECT * FROM ${meta.table} WHERE order_no = ?`, [order_no]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    const order = rows[0];

    let paid = false;
    if (meta.table === 'template_orders' && order.status === 0) {
      await meta.db.query(
        `UPDATE ${meta.table} SET status=1, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`,
        [order_no]);
      paid = true;
    } else if (meta.table === 'package_orders' && order.status === 0) {
      await meta.db.query(
        `UPDATE ${meta.table} SET status=1, pay_method='wechat' WHERE order_no=? AND status=0`,
        [order_no]);
      paid = true;
    } else if (meta.table === 'payment_orders' && order.status === 0) {
      await meta.db.query(
        `UPDATE ${meta.table} SET status=2, pay_method='wechat', paid_at=NOW() WHERE order_no=? AND status=0`,
        [order_no]);
      paid = true;
    }

    if (paid) {
      sendNotify({
        subject: `💰 微信支付到账 ¥${amount}：${order_no}`,
        text: `订单号: ${order_no}\n金额: ¥${amount}\n商品: ${order[meta.nameCol]}\n请及时处理交付。`,
        html: `<p>订单号: <b>${order_no}</b></p><p>金额: <b>¥${amount}</b></p><p>商品: ${order[meta.nameCol]}</p><p>请到管理后台及时处理交付。</p>`,
      });
    }
    res.json({ code: 0 });
  } catch (e) {
    console.error('[notify] 处理失败:', e.message);
    res.status(500).json({ code: -1, message: e.message });
  }
});

// ============ 订单状态轮询（前端支付结果查询）============
// GET /api/payment/status/:orderNo
router.get('/status/:orderNo', async (req, res, next) => {
  try {
    const meta = resolveOrder(req.params.orderNo);
    if (!meta) return res.status(400).json({ code: -1, message: '不支持的订单号' });
    const [rows] = await meta.db.query(
      `SELECT order_no, ${meta.nameCol} AS name, ${meta.amountCol} AS amount, status, created_at${meta.paidAtCol ? `, ${meta.paidAtCol}` : ''} FROM ${meta.table} WHERE order_no = ?`,
      [req.params.orderNo]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// ============ 原有用例（保留）============

// 公开：创建订单（HY 前缀，通用支付订单，保留兼容）
router.post('/', async (req, res, next) => {
  try {
    const { title, amount, customer_name, customer_phone, customer_remark } = req.body;
    if (!title || !amount || amount <= 0) {
      return res.status(400).json({ code: -1, message: '商品名称和金额必填' });
    }
    const orderNo = genOrderNo();
    await pool.query(
      'INSERT INTO payment_orders (order_no, title, amount, customer_name, customer_phone, customer_remark) VALUES (?,?,?,?,?,?)',
      [orderNo, title, amount, customer_name || '', customer_phone || '', customer_remark || '']
    );
    res.json({ code: 0, data: { order_no: orderNo } });
  } catch (e) { next(e); }
});

// 公开：查询订单
router.get('/:orderNo', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT order_no, title, amount, customer_name, status, created_at, paid_at FROM payment_orders WHERE order_no = ?',
      [req.params.orderNo]
    );
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// 公开：上传付款凭证（前端已不再使用，保留作管理员兜底）
router.post('/:orderNo/proof', async (req, res, next) => {
  try {
    const { pay_method } = req.body;
    const [rows] = await pool.query('SELECT id, status FROM payment_orders WHERE order_no = ?', [req.params.orderNo]);
    if (rows.length === 0) return res.status(404).json({ code: -1, message: '订单不存在' });
    if (rows[0].status !== 0) return res.status(400).json({ code: -1, message: '订单状态不允许上传凭证' });

    const { image } = req.body;
    if (!image) return res.status(400).json({ code: -1, message: '请上传付款截图' });

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const matches = image.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({ code: -1, message: '图片格式不正确' });

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const fileName = `proof_${req.params.orderNo}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, matches[2], 'base64');

    await pool.query(
      'UPDATE payment_orders SET status=1, pay_method=?, proof_image=?, paid_at=NOW() WHERE order_no=?',
      [pay_method || 'wechat', `/uploads/${fileName}`, req.params.orderNo]
    );
    res.json({ code: 0, message: '凭证已提交，等待确认' });
  } catch (e) { next(e); }
});

// === 管理接口 ===

// 管理：订单列表
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +pageSize;
    const where = [];
    const params = [];
    if (status !== undefined && status !== '') { where.push('status = ?'); params.push(+status); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM payment_orders ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, +pageSize, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM payment_orders ${whereSql}`, params);
    res.json({ code: 0, data: { list: rows, total, page: +page, pageSize: +pageSize } });
  } catch (e) { next(e); }
});

// 管理：确认到账 / 修改状态
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { status, admin_remark } = req.body;
    const setFields = [];
    const params = [];
    if (status !== undefined) {
      setFields.push('status = ?');
      params.push(+status);
      if (+status === 2) setFields.push('confirmed_at = NOW()'); // 已确认
    }
    if (admin_remark !== undefined) { setFields.push('admin_remark = ?'); params.push(admin_remark); }
    if (setFields.length === 0) return res.status(400).json({ code: -1, message: '无更新字段' });
    params.push(req.params.id);
    await pool.query(`UPDATE payment_orders SET ${setFields.join(',')} WHERE id = ?`, params);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

// 管理：删除订单
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM payment_orders WHERE id = ?', [req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;

const router = require('express').Router();
const pool = require('../db');
const { sendNotify } = require('../mailer');
const { execFile } = require('child_process');
const auth = require('../middleware/auth');

// 公开：提交咨询
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email, company, service_type, budget, message } = req.body;
    if (!name || (!phone && !email)) {
      return res.status(400).json({ code: -1, message: '姓名 + 手机/邮箱 必填' });
    }
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    await pool.query(
      'INSERT INTO contacts (name, phone, email, company, service_type, budget, message, ip) VALUES (?,?,?,?,?,?,?,?)',
      [name, phone, email, company, service_type, budget, message, ip]
    );
    // 新线索双通道通知：邮件 + OpenClaw队列（不阻塞响应）
    const lead = { name, phone, email, company, service_type, budget, message };
    const lines = Object.entries(lead).filter(([,v]) => v).map(([k,v]) => k + ': ' + v).join('\n');
    sendNotify({
      subject: '【新询盘】' + (name || '客户') + (service_type ? ' - ' + service_type : ''),
      text: lines,
      html: '<pre>' + lines + '</pre>'
    }).catch(() => {});
    execFile('bash', ['/data/disk/notify_qq.sh', '新询盘：' + (name||'') + ' ' + (phone||email||'') + ' ' + (service_type||'')], () => {});
    res.json({ code: 0, message: '提交成功，我们将尽快与您联系！' });
  } catch (e) { next(e); }
});

// 管理：列表
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (Math.max(1, +page) - 1) * +pageSize;
    const where = [];
    const params = [];
    if (status !== undefined && status !== '') { where.push('status = ?'); params.push(+status); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT * FROM contacts ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, +pageSize, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM contacts ${whereSql}`, params);
    res.json({ code: 0, data: { list: rows, total, page: +page, pageSize: +pageSize } });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const { status, remark } = req.body;
    await pool.query('UPDATE contacts SET status=?, remark=? WHERE id=?', [status, remark, req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ code: 0 });
  } catch (e) { next(e); }
});

module.exports = router;
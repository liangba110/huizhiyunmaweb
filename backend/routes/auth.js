const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ code: -1, message: '用户名/密码必填' });
    }
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ code: -1, message: '账号或密码错误' });
    }
    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) {
      return res.status(401).json({ code: -1, message: '账号或密码错误' });
    }
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ code: 0, message: '登录成功', data: { token, admin: { id: rows[0].id, username: rows[0].username, nickname: rows[0].nickname } } });
  } catch (e) { next(e); }
});

router.get('/me', auth, async (req, res) => {
  res.json({ code: 0, data: req.admin });
});

module.exports = router;
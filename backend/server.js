const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// 中间件
// CORS - 仅允许我们的域名和生产环境前端
const allowedOrigins = [
  'https://openai2000.cn',
  'https://www.openai2000.cn',
  'https://pay.openai2000.cn',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
app.use(cors({
  origin: function (origin, callback) {
    // 允许没有origin的请求（比如Postman/curl/服务器内部请求）
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('不允许的来源: ' + origin));
    }
  },
  credentials: true,
  maxAge: 86400,
}));
app.disable('x-powered-by');

// ===== 安全增强中间件 =====
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://res.wx.qq.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://openai2000.cn; frame-ancestors 'self'");
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 静态资源
const uploadDir = process.env.UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: 'OK',
    data: {
      service: '汇智云码科技',
      version: '1.0.0',
      time: new Date().toISOString()
    }
  });
});

// ===== Rate Limit =====
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次尝试
  message: { code: -1, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 最多5次提交
  message: { code: -1, message: '提交过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
const freeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 最多5次提交
  message: { code: -1, message: '领取过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 路由
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/contacts', contactLimiter);
app.use('/api/free-resource', freeLimiter);
app.use('/api/free-resource', require('./routes/free-resource'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/company', require('./routes/company'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/packages', require('./routes/packages'));

// 模板商城路由（使用支付系统数据库）
app.use('/api/templates', require('./routes/templates'));
app.use('/api/config', require('./routes/tpl_config'));

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ code: -1, message: err.message || '服务器内部错误' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ code: -1, message: '接口不存在' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ 汇智云码科技 Backend running at http://0.0.0.0:${PORT}`);
});

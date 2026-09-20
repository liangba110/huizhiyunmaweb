const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { sendToUser } = require('../mailer');

const RESOURCE_FILE = path.join(__dirname, '..', '..', 'uploads', 'free', '2026企业开发需求梳理与报价模板.md');

// 公开：免费资料领取（记录邮箱 + 自动发送邮件）
router.post('/', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ code: -1, message: '请填写正确的邮箱地址' });
    }
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    await pool.query(
      'INSERT INTO contacts (name, phone, email, company, service_type, budget, message, ip) VALUES (?,?,?,?,?,?,?,?)',
      ['免费资料领取', '', email, '', '免费资料', '', '领取《2026企业开发需求梳理与报价模板》', ip]
    );

    const subject = '《2026企业开发需求梳理与报价模板》已生成，请查收';
    const html = `
<div style="font-family:Arial,'Microsoft YaHei',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1E293B;line-height:1.8;">
  <h2 style="margin:0 0 12px;">您好，感谢关注汇智云码科技</h2>
  <p>您申请的《2026企业开发需求梳理与报价模板》已生成，见本邮件附件。</p>
  <p>模板包含：需求沟通清单、报价构成表、开发避坑指南、合作流程与合同要点，可直接填写使用。</p>
  <p>更多小程序开发、APP开发、企业建站的实战内容，欢迎访问：<a href="https://www.openai2000.cn" style="color:#2563EB;">www.openai2000.cn</a></p>
  <p style="margin-top:24px;color:#64748B;font-size:13px;">本邮件由汇智云码科技自动发送，无需回复。若未收到附件，请检查垃圾箱。</p>
</div>`;

    let attachments = [];
    if (fs.existsSync(RESOURCE_FILE)) {
      attachments.push({
        filename: '2026企业开发需求梳理与报价模板.md',
        path: RESOURCE_FILE,
        contentType: 'text/markdown; charset=utf-8',
      });
    }

    const r = await sendToUser({ to: email, subject, html, attachments });
    if (!r.ok) throw new Error(r.msg || '邮件发送失败');

    res.json({ code: 0, message: '资料已发送到您的邮箱，请查收（若未收到请检查垃圾箱）' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

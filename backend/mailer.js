/**
 * 邮件发送模块（基于 nodemailer，163 SMTP）
 * 用于：客户咨询/线索 → 成交通知老板
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.163.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true, // 465 端口 SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // 163 邮箱需要
    tls: { rejectUnauthorized: false },
  });
  return transporter;
}

/**
 * 发送咨询/成交通知邮件给老板
 * @param {Object} opts { subject, text, html }
 */
async function sendNotify({ subject, text, html }) {
  try {
    if (!process.env.SMTP_USER) {
      console.warn('[mail] 未配置SMTP，跳过发送');
      return { ok: false, msg: 'SMTP未配置' };
    }
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"汇智云码科技" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL || '964539086@qq.com',
      subject: subject || '汇智云码 - 新客户咨询通知',
      text,
      html,
    });
    console.log('[mail] 邮件已发送:', info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[mail] 发送失败:', e.message);
    return { ok: false, msg: e.message };
  }
}

/**
 * 发送资料/内容邮件给用户（免费资料自动发送）
 * @param {Object} opts { to, subject, text, html, attachments }
 */
async function sendToUser({ to, subject, text, html, attachments }) {
  try {
    if (!process.env.SMTP_USER || !to) {
      return { ok: false, msg: 'SMTP未配置或收件人为空' };
    }
    const t = getTransporter();
    const info = await t.sendMail({
      from: `"汇智云码科技" <${process.env.SMTP_USER}>`,
      to,
      subject: subject || '汇智云码科技 - 免费资料领取',
      text,
      html,
      attachments: attachments || [],
    });
    console.log('[mail] 用户邮件已发送:', info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[mail] 用户邮件发送失败:', e.message);
    return { ok: false, msg: e.message };
  }
}

module.exports = { sendNotify, sendToUser, getTransporter };

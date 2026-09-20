const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { sendNotify } = require('../mailer');

const ARK_KEY = process.env.ARK_API_KEY || '';
const ARK_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3') + '/chat/completions';
const MODEL = process.env.ARK_MODEL || 'ark-code-latest';

// ============ AI 客服系统提示词（品牌客服口吻） ============
const SYSTEM_PROMPT = `你是"汇智云码科技"的在线客服"小汇"，负责接待咨询企业软件开发业务的客户。

【公司真实信息】
- 公司：汇智云码科技（青岛），地址：山东省青岛市胶州市阜安街道东关大街8号中央公园写字楼11楼办公室
- 核心业务：网站建设、小程序开发、APP开发（标准化套餐为主），也接定制
- 团队来自腾讯、阿里、字节，服务120+企业客户，交付200+项目
- 已交付60+款上线App、50+商家小程序，月活用户超500万

【重磅：标准化服务套餐（用户可直接在线下单，无需定制）】
我们提供覆盖【网站建设/小程序/APP】三大类、多行业（电商/餐饮/美容预约/教育/同城服务/通用）的标准化套餐，每个套餐三档（基础/专业/旗舰），明码标价，页面：www.openai2000.cn/packages 在线直接选择下单。

【核心套餐价格（必须熟记并直接推荐）】
网站建设：
- 展示型官网 ¥1999（基础），营销型官网 ¥4999（专业），电商网站 ¥9999（旗舰）
小程序：
- 展示小程序 ¥2999（基础），电商小程序 ¥5999（专业），点餐小程序 ¥4999（专业拉），全功能 ¥9999（旗舰）
APP开发：
- 单端APP ¥15999（基础），双端APP ¥29999（专业），全栈APP ¥45999（旗舰）
（不同行业的套餐价格略有不同，但都在上述区间附近，客户可直接上套餐页看具体行业价格）

【对话规则（重要）：
1. 前提客户有需求时，优先直接推荐【标准化套餐】并给出明确价格，而不是问一堆定制需求。
2. 客户问“多少钱/价格/报价”时，直接告诉他对应方向的标准套餐价格区间，**并在回复末尾加上套餐按钮标记**（这样前端会渲染成可点击的蓝色按钮，带客户直接跳到对应套餐页下单）。

【套餐按钮标记用法（必须掌握）】
- 当推荐“小程序”套餐时，在回复末尾单独一行加上：
  【套餐:小程序】
- 推荐“网站”套餐时加【套餐:网站】
- 推荐“APP”套餐时加【套餐:APP】
- 若客户明确了行业（如电商餐饮），可带行业：【套餐:小程序:电商】、【套餐:网站:餐饮】
- 每个回复最多1-2个按钮标记，放在最后。
- 客户问价格就必须给按钮，引导在线下单，这是核心的成交动作。
3. 推荐套路：先问客户“要网站/小程序/APP？什么行业？”→ 根据行业和预算推荐对应档位套餐 → 给出价格 → 引导下单。
4. 客户说“定制/特殊需求/大型”时，才接定制并引导留电话。前期以套餐为主。
5. 语气专业热情简洁，像真人销售。
6. 回复控制在150字内，分点清晰。

【电话防骚扰规则】
- 客户主动索要联系电话时，回复：“您可以直接在套餐页 www.openai2000.cn/packages 下单，或留下电话/微信，我们的技术顾问会尽快联系您一对一服务。”（绝不直接给出公司销售电话）`;

// 可选的行业价格表（动态传入，用于 AI 精准推荐）
const INDUSTRY_PRICE_HINT = `各行业代表性套餐价格（供推荐参考）：
【电商】官网¥2399/5999/11999；小程序¥3499/6999/11999；APP¥18999/32999/49999
【餐饮】官网¥2199/5499/10999；小程序¥3499/4999/9999；APP¥17999/30999/46999
【美容预约】官网¥2199/5499/10999；小程序¥3499/5499/9999；APP¥17999/30999/46999
【教育】官网¥2199/5499/10999；小程序¥3499/5999/9999；APP¥17999/30999/46999
【同城服务】官网¥2199/5499/10999；小程序¥3499/5999/9999；APP¥17999/30999/46999`;

// 生成/获取会话
function getSessionKey(req) {
  return req.body.session_key || crypto.randomBytes(16).toString('hex');
}

// 调用 AI
async function callAI(messages) {
  const resp = await fetch(ARK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ARK_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 800
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI错误 ${resp.status}: ${err.slice(0,200)}`);
  }
  const data = await resp.json();
  return data.choices[0].message.content.trim();
}

// 获取会话历史（最近N条）
async function getHistory(sessionKey, limit = 12) {
  const [sess] = await pool.query('SELECT id FROM chat_sessions WHERE session_key=?', [sessionKey]);
  if (sess.length === 0) return [];
  const sessionId = sess[0].id;
  const [msg] = await pool.query(
    'SELECT role, content FROM chat_messages WHERE session_id=? ORDER BY id DESC LIMIT ?',
    [sessionId, limit]
  );
  return msg.reverse();
}

// ============ POST /api/chat 客户发消息 ============
router.post('/', async (req, res) => {
  try {
    const { session_key, message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ code: -1, msg: '消息不能为空' });
    }
    const sessionKey = session_key || getSessionKey(req);
    const ip = getClientIp(req);

    // 1. 找到/创建会话
    let [sess] = await pool.query('SELECT id, ip FROM chat_sessions WHERE session_key=?', [sessionKey]);
    let sessionId;
    if (sess.length === 0) {
      const [r] = await pool.query(
        'INSERT INTO chat_sessions (session_key, ip) VALUES (?,?)', [sessionKey, ip]
      );
      sessionId = r.insertId;
    } else {
      // 已有会话：IP绑定校验，防止拿着他人session_key冒充发消息
      if (sess[0].ip && ip && sess[0].ip !== ip) {
        return res.status(403).json({ code: 403, msg: '无权操作该会话'} );
      }
      sessionId = sess[0].id;
    }

    // 2. 组装上下文调用 AI（先取历史，避免包含刚插入的当前消息导致重复）
    const history = await getHistory(sessionKey);
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + INDUSTRY_PRICE_HINT },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: String(message) }
    ];

    // 3. 存用户消息
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?,?,?)',
      [sessionId, 'user', String(message).slice(0, 2000)]
    );

    let reply;
    try {
      reply = await callAI(messages);
    } catch (e) {
      console.error('AI调用失败:', e.message);
      reply = '您好，感谢您的咨询！我们技术顾问正在路上，稍后会有专人联系您。您也可以方便留个电话或微信吗？我们会尽快给您出详细方案和报价。';
    }

    // 4. 存 AI 回复
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?,?,?)',
      [sessionId, 'assistant', reply.slice(0, 3000)]
    );

    res.json({ code: 0, session_key: sessionKey, reply, session_id: sessionId });
  } catch (e) {
    console.error('chat error:', e.message);
    res.status(500).json({ code: -1, msg: '服务异常，请稍后再试' });
  }
});

// ============ POST /api/chat/lead 客户留线索 ============
router.post('/lead', async (req, res) => {
  try {
    const { session_key, name, phone, wechat, email, service_type, budget, message } = req.body;
    if (!session_key) return res.status(400).json({ code: -1, msg: '缺少会话' });

    const [sess] = await pool.query('SELECT id FROM chat_sessions WHERE session_key=?', [session_key]);
    if (sess.length === 0) return res.status(404).json({ code: -1, msg: '会话不存在' });
    const sessionId = sess[0].id;

    await pool.query(
      `UPDATE chat_sessions SET 
        client_name=?, client_phone=?, client_wechat=?, client_email=?, lead_status=CASE WHEN lead_status=0 THEN 1 ELSE lead_status END
       WHERE id=?`,
      [name || null, phone || null, wechat || null, email || null, sessionId]
    );

    // 记录一条线索到 contacts 表（与表单咨询统一）
    if (phone || wechat || email) {
      await pool.query(
        `INSERT INTO contacts (name, phone, email, company, service_type, budget, message, status, ip) 
         VALUES (?,?,?,?,?,?,?,1,?)`,
        [
          name || 'AI客服线索',
          phone || null,
          email || null,
          null,
          service_type || null,
          budget || null,
          message || '来自AI在线客服对话',
          (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()
        ]
      );

      // 发送邮件通知老板（成交通知线索）
      const esc = (s) => String(s || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      sendNotify({
        subject: `💼 新客户咨询：${esc(name || '未留名')}（${service_type || '业务咨询'}）`,
        html: `
          <div style="font-family:Microsoft YaHei,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1E40AF,#6D28D9);padding:16px;color:#fff">
              <h2 style="margin:0;font-size:18px">🆕 汇智云码 - 新客户咨询线索</h2>
              <div style="font-size:13px;opacity:.85">来自 AI 在线客服，已自动记录</div>
            </div>
            <div style="padding:20px;font-size:14px;line-height:1.8;color:#1f2937">
              <p><strong>客户称呼：</strong>${esc(name || '未留名')}</p>
              <p><strong>联系电话：</strong>${esc(phone || '未提供')}</p>
              <p><strong>微信/邮箱：</strong>${esc((wechat || email) || '未提供')}</p>
              <p><strong>咨询方向：</strong>${esc(service_type || '业务咨询')}</p>
              <p><strong>预算范围：</strong>${esc(budget || '未提供')}</p>
              <p><strong>需求描述：</strong>${esc(message || '无')}</p>
              <p style="color:#94a3b8;font-size:12px">建议尽快回访，把握成交时机。可在管理后台「客服对话」查看完整聊天记录。</p>
              <a href="https://www.openai2000.cn/admin" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#1E40AF;color:#fff;text-decoration:none;border-radius:6px">进入管理后台</a>
            </div>
          </div>`
      });
    }

    const thankMsg = `感谢您${name ? ' ' + name + ' ' : ''}的信任！我们已经记录您的需求，技术顾问会在1个工作日内联系您。`;
    await pool.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES (?,?,?)',
      [sessionId, 'assistant', thankMsg]
    );

    res.json({ code: 0, msg: '已记录，技术顾问将尽快联系您', reply: thankMsg });
  } catch (e) {
    console.error('lead error:', e.message);
    res.status(500).json({ code: -1, msg: '保存失败' });
  }
});

// ============ GET /api/chat/leads 管理后台：查看线索（需登录）============
router.get('/leads', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cs.id, cs.session_key, cs.client_name, cs.client_phone, cs.client_wechat, 
              cs.client_email, cs.lead_status, cs.ip, cs.created_at,
              (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id=cs.id) AS msg_count
       FROM chat_sessions cs ORDER BY cs.id DESC LIMIT 100`
    );
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ GET /api/chat/history 客户打开时加载历史消息 ============
// 获取客户端真实IP（兼容代理）
function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.ip || '').split(',')[0].trim();
}

// ============ GET /api/chat/history 客户查自己的对话（IP绑定校验）============
router.get('/history', async (req, res) => {
  try {
    const sessionKey = req.query.session_key;
    if (!sessionKey) return res.json({ code: 0, data: [] });
    const clientIp = getClientIp(req);
    const [sess] = await pool.query('SELECT id, ip FROM chat_sessions WHERE session_key=?', [sessionKey]);
    if (sess.length === 0) return res.json({ code: 0, data: [] });
    // IP绑定校验：仅允许会话创建时的IP访问该会话记录（防跨设备窃取）
    if (sess[0].ip && clientIp && sess[0].ip !== clientIp) {
      return res.status(403).json({ code: 403, msg: '无权访问该会话记录' });
    }
    const history = await getHistory(sessionKey, 30);
    res.json({ code: 0, data: history });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

// ============ GET /api/chat/:session 详情（对话记录，管理员）============
router.get('/:sessionKey', auth, async (req, res) => {
  try {
    const [sess] = await pool.query('SELECT id FROM chat_sessions WHERE session_key=?', [req.params.sessionKey]);
    if (sess.length === 0) return res.json({ code: 0, data: [] });
    const [msgs] = await pool.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id=? ORDER BY id',
      [sess[0].id]
    );
    res.json({ code: 0, data: msgs });
  } catch (e) {
    res.status(500).json({ code: -1, msg: '查询失败' });
  }
});

module.exports = router;

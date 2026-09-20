<template>
  <div class="chat-widget">
    <!-- 浮动气泡（右侧中间，带文字标签） -->
    <button v-if="!open" class="chat-fab" @click="openChat" :aria-label="'在线客服'">
      <span class="fab-icon-wrap">
        <svg v-if="!hasUnread" class="chat-fab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-9 5h2v2h-2V7zm0 4h2v5h-2v-5z"/></svg>
        <svg v-else class="chat-fab-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 0 0-9 9c0 1.7.5 3.3 1.3 4.7L3 20l3.4-1.2A9 9 0 1 0 12 3zm-1 5h2v5h-2V8zm0 6h2v2h-2v-2z"/></svg>
        <span v-if="hasUnread" class="chat-fab-badge">{{ unreadCount }}</span>
      </span>
      <span class="fab-label">在线<br>客服</span>
    </button>

    <!-- 聊天窗口 -->
    <div v-if="open" class="chat-panel">
      <!-- 头部 -->
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">汇</div>
          <div>
            <div class="chat-title">汇智云码 · 在线客服</div>
            <div class="chat-status">● 在线，通常几秒内回复</div>
          </div>
        </div>
        <button class="chat-close" @click="closeChat">✕</button>
      </div>

      <!-- 消息区 -->
      <div class="chat-body" ref="bodyRef">
        <div v-if="!started" class="chat-greeting">
          <div class="chat-bubble ai">
            <div class="greeting-title">👋 您好，欢迎咨询汇智云码科技！</div>
            <p>我是客服"小汇"，可以为您解答：</p>
            <ul>
              <li>📱 小程序开发费用与周期</li>
              <li>📲 APP定制开发方案</li>
              <li>🌐 企业网站/系统建设</li>
              <li>🏆 成功案例介绍</li>
            </ul>
            <div class="greeting-hint">请问您想咨询哪方面的业务呢？点下方的常见问题即可快速开始 ⬇️</div>
          </div>
          <div class="chat-quick">
            <button v-for="q in quickQuestions" :key="q" class="quick-btn" @click="send(q)">{{ q }}</button>
          </div>
        </div>

        <div v-for="(m, i) in messages" :key="i" class="chat-row" :class="m.role">
          <div class="chat-bubble" v-html="m.content"></div>
        </div>

        <!-- 手机号获取卡片（AI 引导后由用户主动点击） -->
        <div v-if="showContactCard" class="contact-card">
          <div class="contact-card-title">📞 获取专属联系方式</div>
          <p>留下您的需求，技术顾问为您一对一提供方案与报价</p>
          <div class="contact-form">
            <input v-model="leadForm.name" placeholder="您的称呼（选填）">
            <input v-model="leadForm.contact" placeholder="手机号 / 微信号 / 邮箱">
            <button class="contact-submit" @click="submitLead" :disabled="leadSubmitting">
              {{ leadSubmitting ? '提交中...' : '提交，获取联系方式' }}
            </button>
          </div>
          <div class="contact-reveal" v-if="revealed">
            <div class="reveal-line">技术顾问电话（点击复制）：</div>
            <button class="phone-reveal" @click="copyPhone">{{ phoneDisplay }} 📋</button>
            <div class="reveal-note">工作时间 9:00-18:00，建议直接电话或微信</div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-area">
        <textarea
          v-model="draft"
          class="chat-input"
          rows="1"
          placeholder="输入您的问题，回车发送"
          @keydown.enter.exact.prevent="send(draft)"
        ></textarea>
        <button class="chat-send" @click="send(draft)" :disabled="sending || !draft.trim()">
          {{ sending ? '…' : '发送' }}
        </button>
      </div>
      <div class="chat-footer">汇智云码科技 · 专业软件开发服务</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue';
import axios from 'axios';

const open = ref(false);
const started = ref(false);
const messages = ref([]);
const sending = ref(false);
const draft = ref('');
const bodyRef = ref(null);
const sessionKey = ref('');
const hasUnread = ref(false);
const unreadCount = ref(0);
const showContactCard = ref(false);
const contactCardShown = ref(false);
const revealed = ref(false);
const leadSubmitting = ref(false);
const leadForm = reactive({ name: '', contact: '' });

const _cp = ['187','6620','2024'].join('');
const phoneDisplay = _cp.slice(0,3) + '****' + _cp.slice(7); // 脱敏显示

const quickQuestions = [
  '开发一个小程序要多少钱？',
  'APP开发一般需要多久？',
  '你们有什么成功案例？',
  '网站建设多少钱？',
  '套餐怎么选？帮我推荐',
  '多久能上线交付？',
  '可以做电商小程序吗？',
  '售后和运维怎么算？',
  '怎么联系你们？',
];

// 初始化会话
function initSession(force) {
  let key = localStorage.getItem('tt_yunma_chat_key');
  if (force || !key) {
    key = 'yk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('tt_yunma_chat_key', key);
  }
  sessionKey.value = key;
}

function scrollBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
  });
}

function openChat() {
  open.value = true;
  hasUnread.value = false;
  unreadCount.value = 0;
  if (!sessionKey.value) initSession();
  loadHistory();
  scrollBottom();
}

// 打开时加载后端历史消息
async function loadHistory() {
  try {
    const { data } = await axios.get('/api/chat/history', {
      params: { session_key: sessionKey.value }
    });
    if (data.code === 0 && Array.isArray(data.data) && data.data.length > 0) {
      // 有历史记录：填充消息，不显示欢迎语
      started.value = true;
      messages.value = data.data.map(m => ({
        role: m.role === 'user' ? 'user' : 'ai',
        content: m.role === 'user' ? escapeHtml(m.content) : markdown(m.content)
      }));
    } else {
      // 无历史：保留欢迎语
      started.value = true;
    }
    scrollBottom();
  } catch (e) {
    // 换IP后旧会话被锁定：换新会话重新加载历史
    if (e.response && e.response.status === 403) {
      initSession(true);
      await loadHistory();
      return;
    }
    started.value = true;
  }
}

function closeChat() {
  open.value = false;
}

async function send(text) {
  const content = String(text || '').trim();
  if (!content || sending.value) return;
  draft.value = '';
  if (!sessionKey.value) initSession();

  messages.value.push({ role: 'user', content: escapeHtml(content) });
  started.value = true;
  sending.value = true;
  scrollBottom();

  try {
    const { data } = await axios.post('/api/chat', {
      session_key: sessionKey.value,
      message: content
    });
    if (data.code === 0) {
      messages.value.push({ role: 'ai', content: markdown(data.reply) });
      sessionKey.value = data.session_key || sessionKey.value;
    } else {
      messages.value.push({ role: 'ai', content: '抱歉，服务暂时开小差了，请稍后再试。' });
    }
  } catch (e) {
    // HTTP 403 = 会话IP绑定失败（用户换网络了）：重置会话重发一次，用户无感知
    if (e.response && e.response.status === 403) {
      initSession(true);
      try {
        const { data: d2 } = await axios.post('/api/chat', {
          session_key: sessionKey.value,
          message: content
        });
        if (d2.code === 0) {
          messages.value.push({ role: 'ai', content: markdown(d2.reply) });
          sessionKey.value = d2.session_key || sessionKey.value;
        } else {
          messages.value.push({ role: 'ai', content: '抱歉，服务暂时开小差了，请稍后再试。' });
        }
      } catch (e2) {
        messages.value.push({ role: 'ai', content: '网络异常，请稍后再试，或直接拨打咨询电话。' });
      }
    } else {
      messages.value.push({ role: 'ai', content: '网络异常，请稍后再试，或直接拨打咨询电话。' });
    }
  }
  sending.value = false;
  scrollBottom();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function markdown(s) {
  // 1. 先处理【套餐:xxx】按钮标记 → 跳转套餐页按钮
  //    格式：【套餐:小程序】 或 【套餐:小程序:电商】
  let html = String(s)
    .replace(/【套餐[:：]([^】]+)】/g, (m, param) => {
      const bizMap = { '网站': 'website', '网站建设': 'website', '建站': 'website', '小程序': 'miniapp', 'APP': 'app', 'App': 'app', 'app': 'app' };
      const indMap = { '电商': '电商', '餐饮': '餐饮', '美容': '美容预约', '美业': '美容预约', '美容预约': '美容预约', '教育': '教育', '同城': '同城服务' };
      const parts = param.split(/[:：]/).map(p => p.trim()).filter(Boolean);
      const bizKey = bizMap[parts[0]] || '';
      const ind = parts[1] ? (indMap[parts[1]] || parts[1]) : '';
      const query = [];
      if (bizKey) query.push('biz=' + bizKey);
      if (ind) query.push('industry=' + encodeURIComponent(ind));
      const qs = query.length ? '?' + query.join('&') : '';
      return `<a class="pkg-jump-btn" href="/packages${qs}" target="_self"><span class="pkg-btn-main">🛒 查看${parts[0]}套餐报价</span><span class="pkg-btn-arrow">点击跳转 →</span></a>`;
    });

  // 2. 处理加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 3. 处理换行
  html = html.replace(/\n/g, '<br>');

  // 4. 把裸链接（openai2000.cn / http）转成可点击链接
  html = html.replace(/(www\.openai2000\.cn\/packages[\w\-?&=/%]*)/g, '<a class="chat-link" href="https://$1" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/(https?:\/\/[^\s<>"']+)/g, (m) => {
    if (m.startsWith('http')) {
      const display = m.replace(/^https?:\/\//, '');
      return `<a class="chat-link" href="${m}" target="_blank" rel="noopener">${display}</a>`;
    }
    return m;
  });

  return html;
}

async function submitLead() {
  const contact = leadForm.contact.trim();
  if (!contact) { alert('请填写手机号、微信号或邮箱'); return; }
  leadSubmitting.value = true;
  try {
    await axios.post('/api/chat/lead', {
      session_key: sessionKey.value,
      name: leadForm.name.trim() || null,
      phone: /^\d{6,}$/.test(contact) ? contact : null,
      wechat: !/^\d{6,}$/.test(contact) && contact.includes('微信') ? contact : null,
      email: contact.includes('@') ? contact : null,
      message: '通过AI客服获取联系方式'
    });
    // 客户提交后显示真实手机号
    revealed.value = true;
    showContactCard.value = false;
    contactCardShown.value = true;
    messages.value.push({ role: 'ai', content: '✅ 已收到！您的专属联系方式已解锁，点击下方号码即可联系技术顾问。' });
  } catch (e) {
    alert('提交失败，请稍后再试');
  }
  leadSubmitting.value = false;
  scrollBottom();
}

async function copyPhone() {
  try {
    await navigator.clipboard.writeText(['187','6620','2024'].join(''));
    alert('手机号 187-6620-2024 已复制，请拨打电话咨询');
  } catch (e) {
    prompt('请手动复制手机号：', ['187','6620','2024'].join('-'));
  }
}

onMounted(() => {
  initSession();
  // 3秒后如果未打开，显示消息气泡（吸引点击）
  setTimeout(() => {
    if (!open.value) {
      hasUnread.value = true;
      unreadCount.value = 1;
    }
  }, 4000);
});
</script>

<style scoped>
.chat-widget { position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 99999; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif; }
.chat-fab { width: auto; display: flex; align-items: center; gap: 0; background: linear-gradient(135deg,#1E40AF,#6D28D9); color: #fff; border: none; cursor: pointer; box-shadow: 0 6px 20px rgba(37,99,235,0.4); position: relative; transition: transform 0.2s; border-radius: 10px 0 0 10px; padding: 10px 10px 10px 12px; }
.fab-icon-wrap { position: relative; display: flex; align-items: center; }
.chat-fab:hover { box-shadow: 0 8px 24px rgba(37,99,235,0.5); }
.chat-fab-icon { width: 26px; height: 26px; }
.fab-label { font-size: 12px; font-weight: 600; line-height: 1.3; padding-left: 8px; text-align: left; white-space: nowrap; }
.chat-fab-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: #fff; font-size: 11px; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; border: 2px solid #fff; }

.chat-panel { position: fixed; top: 50%; right: 0; transform: translateY(-50%); width: 360px; max-width: calc(100vw - 56px); height: 520px; max-height: calc(100vh - 80px); background: #fff; border-radius: 16px 0 0 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; }
.chat-header { background: linear-gradient(135deg,#1E40AF,#6D28D9); color: #fff; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
.chat-header-info { display: flex; align-items: center; gap: 10px; }
.chat-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
.chat-title { font-weight: 600; font-size: 15px; }
.chat-status { font-size: 11px; opacity: .85; }
.chat-close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; padding: 4px; }

.chat-body { flex: 1; overflow-y: auto; padding: 16px; background: #f8fafc; }
.chat-row { margin-bottom: 12px; display: flex; }
.chat-row.user { justify-content: flex-end; }
.chat-bubble { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.6; word-break: break-word; }
.chat-row.user .chat-bubble { background: #1E40AF; color: #fff; border-bottom-right-radius: 4px; }
.chat-row.ai .chat-bubble { background: #fff; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
.ai .chat-bubble a.chat-link { color: #2563eb; text-decoration: underline; font-weight: 500; }
.ai .pkg-jump-btn { display: block; margin: 10px 0 4px; padding: 12px 16px; background: linear-gradient(135deg, #ff4d4f, #e60012); color: #fff !important; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; text-align: center; box-shadow: 0 0 0 3px rgba(255,77,79,.25), 0 6px 20px rgba(230,0,18,.45); border: 2px solid rgba(255,255,255,.35); transition: all 0.2s; position: relative; overflow: hidden; animation: pkg-jump-pulse 2.2s ease-in-out infinite; }
.ai .pkg-jump-btn .pkg-btn-main { display: block; font-size: 16px; letter-spacing: 0.5px; font-weight: 800; }
.ai .pkg-jump-btn .pkg-btn-arrow { display: block; font-size: 13px; font-weight: 500; opacity: 0.95; margin-top: 2px; }
.ai .pkg-jump-btn:hover { animation: none; transform: translateY(-2px) scale(1.02); box-shadow: 0 0 0 5px rgba(255,77,79,.3), 0 10px 28px rgba(230,0,18,.6); background: linear-gradient(135deg, #ff6b6e, #e60012); }
.ai .pkg-jump-btn:hover .pkg-btn-arrow::after { content: ' 点击即可跳转'; opacity: 0.85; }
.ai .pkg-jump-btn:active { transform: scale(0.98); }
@keyframes pkg-jump-pulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(255,77,79,.25), 0 6px 20px rgba(230,0,18,.45); transform: scale(1); } 50% { box-shadow: 0 0 0 6px rgba(255,77,79,.15), 0 9px 30px rgba(230,0,18,.6); transform: scale(1.015); } }

.chat-greeting .chat-bubble { background: #fff; border: 1px solid #e5e7eb; }
.greeting-title { font-weight: 600; margin-bottom: 8px; }
.chat-greeting ul { margin: 8px 0; padding-left: 18px; }
.chat-greeting li { margin: 4px 0; }
.greeting-hint { margin-top: 8px; color: #64748b; font-size: 13px; }
.chat-quick { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.quick-btn { padding: 8px 14px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 18px; font-size: 13px; color: #3730a3; cursor: pointer; transition: all 0.15s; }
.quick-btn:hover { background: #e0e7ff; border-color: #818cf8; transform: translateY(-1px); }

.contact-card { background: #fff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; margin-top: 12px; }
.contact-card-title { font-weight: 700; color: #1e40af; margin-bottom: 6px; }
.contact-card p { font-size: 13px; color: #475569; margin-bottom: 10px; }
.contact-form { display: flex; flex-direction: column; gap: 8px; }
.contact-form input { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; }
.contact-submit { padding: 10px; background: #1E40AF; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.contact-submit:hover { background: #1e3a8a; }
.contact-reveal { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
.reveal-line { font-size: 13px; color: #475569; margin-bottom: 8px; }
.phone-reveal { display: block; width: 100%; padding: 12px; background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 8px; font-size: 20px; font-weight: 700; cursor: pointer; }
.phone-reveal:hover { background: #bbf7d0; }
.reveal-note { font-size: 12px; color: #94a3b8; margin-top: 8px; text-align: center; }

.chat-input-area { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e5e7eb; background: #fff; }
.chat-input { flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 14px; resize: none; outline: none; max-height: 80px; }
.chat-send { padding: 10px 18px; background: #1E40AF; color: #fff; border: none; border-radius: 10px; font-size: 14px; cursor: pointer; }
.chat-send:disabled { opacity: .5; cursor: not-allowed; }
.chat-footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 6px; background: #fff; border-top: 1px solid #f1f5f9; }
</style>

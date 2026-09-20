<template>
  <div class="shop-page">
    <section class="shop-hero">
      <div class="container">
        <span class="section-tag">TEMPLATES</span>
        <h1>在线模板商城</h1>
        <p>精选企业级网站模板，购买后源码交付，支持二次开发</p>
      </div>
    </section>

    <section class="shop-body">
      <div class="container">
        <!-- 分类筛选 -->
        <div class="filter-bar">
          <button :class="['filter-btn', { active: filterCategory === '' }]" @click="filterCategory='';loadTemplates()">全部</button>
          <button :class="['filter-btn', { active: filterCategory === c }]" v-for="c in categories" :key="c" @click="filterCategory=c;loadTemplates()">{{ c }}</button>
        </div>

        <!-- 内容区 -->
        <div v-if="templates.length === 0" class="empty-state">
          <span class="empty-icon">📦</span>
          <p>暂无上架模板</p>
        </div>
        <div v-else class="tpl-grid">
          <div v-for="tpl in templates" :key="tpl.id" class="tpl-card" @click="selectTemplate(tpl)">
            <div class="tpl-badge" :class="'badge-' + tpl.level"><span class="badge-level">{{ levelLabel(tpl.level) }}</span> · <span class="badge-price">¥{{ formatAmount(tpl.price) }}</span></div>
            <div class="tpl-cover">
              <img :src="tpl.preview_images && tpl.preview_images[0] ? tpl.preview_images[0] : ''" :alt="tpl.name" @error="onImgError" loading="lazy">
            </div>
            <div class="tpl-info">
              <h3>{{ tpl.name }}</h3>
              <p>{{ truncate(tpl.description, 80) }}</p>
              <div class="tpl-actions">
                <span class="tpl-action">立即购买 →</span>
                <a :href="tpl.demo_url" target="_blank" class="tpl-demo-btn" v-if="tpl.demo_url">在线演示</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 购买弹窗 -->
    <Teleport to="body">
      <div v-if="selectedTpl" class="modal-overlay" @click.self="selectedTpl=null">
        <div class="modal-panel">

          <!-- 步骤1: 详情 -->
          <div v-if="purchaseStep === 1">
            <div class="modal-header">
              <h2>{{ selectedTpl.name }}</h2>
              <span class="close-btn" @click="selectedTpl=null">✕</span>
            </div>
            <span :class="['tpl-badge', 'badge-' + selectedTpl.level]" style="position:static;margin-bottom:12px;display:inline-block">{{ levelLabel(selectedTpl.level) }}</span>
            <p class="modal-desc">{{ selectedTpl.description }}</p>
            <div v-if="selectedTpl.features?.length" class="feature-list">
              <h4>📋 包含功能</h4>
              <ul>
                <li v-for="(f, i) in selectedTpl.features" :key="i">{{ f }}</li>
              </ul>
            </div>
            <div v-if="selectedTpl.demo_url" style="margin:16px 0">
              <a :href="selectedTpl.demo_url" target="_blank" class="btn btn-outline">👁 查看在线演示</a>
            </div>
            <div class="price-row">
              <span>价格</span>
              <strong>¥{{ formatAmount(selectedTpl.price) }}</strong>
            </div>
            <button class="btn btn-primary btn-block" @click="purchaseStep = 2">💳 立即购买</button>
          </div>

          <!-- 步骤2: 填信息并下单 -->
          <div v-if="purchaseStep === 2">
            <div class="modal-header">
              <h2>填写信息</h2>
              <span class="close-btn" @click="selectedTpl=null">✕</span>
            </div>
            <p style="color:var(--text-light);margin-bottom:20px">您正在购买：<strong>{{ selectedTpl.name }}</strong>（<strong style="color:#DC2626;font-weight:800">¥{{ formatAmount(selectedTpl.price) }}</strong>）</p>
            <form @submit.prevent="doPurchase">
              <div class="form-group"><label>姓名</label><input v-model="purchaseForm.name" required placeholder="您的真实姓名"></div>
              <div class="form-group"><label>手机号</label><input v-model="purchaseForm.phone" required placeholder="联系方式"></div>
              <div class="form-group"><label>邮箱</label><input v-model="purchaseForm.email" type="email" placeholder="接收下载链接（选填）"></div>
              <div class="form-group"><label>备注</label><textarea v-model="purchaseForm.remark" rows="2" placeholder="特殊需求（选填）"></textarea></div>
              <button type="submit" class="btn btn-primary btn-block" :disabled="purchasing">
                {{ purchasing ? '生成订单中...' : '✅ 提交并去支付（¥' + formatAmount(selectedTpl.price) + '）' }}
              </button>
            </form>
            <p style="text-align:center;margin-top:12px"><a class="text-link" @click="purchaseStep = 1">← 返回</a></p>
          </div>

          <!-- 步骤3: 微信扫码支付（Native） -->
          <div v-if="purchaseStep === 3">
            <div class="modal-header">
              <h2>扫码支付</h2>
              <span class="close-btn" @click="selectedTpl=null">✕</span>
            </div>
            <div class="order-summary">
              <div class="summary-row"><span>订单号</span><strong class="order-no">{{ newOrder.order_no }}</strong></div>
              <div class="summary-row"><span>模板</span><strong>{{ newOrder.template_name }}</strong></div>
              <div class="summary-row"><span>金额</span><strong style="color:#DC2626">¥{{ formatAmount(newOrder.amount) }}</strong></div>
              <div class="summary-row"><span>状态</span><span class="status-tag" :class="payState==='success'?'ok':'warn'">{{ payStateText }}</span></div>
            </div>

            <div class="pay-panel" v-if="payState !== 'success'">
              <h4>💚 微信扫码支付</h4>
              <p style="font-size:13px;color:var(--text-light);margin:10px 0 14px">
                请使用<strong>微信扫一扫</strong>扫描下方二维码完成支付
              </p>
              <div class="wx-qr-box">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="微信支付二维码">
                <div v-else class="qr-loading">⏳ 二维码生成中...</div>
              </div>
              <p style="font-size:12px;color:var(--text-mute);margin-top:10px">支付金额 <strong style="color:#DC2626;font-weight:800">¥{{ formatAmount(newOrder.amount) }}</strong></p>
              <button class="btn btn-primary btn-block" style="margin-top:12px" @click="startPay(newOrder.order_no)" :disabled="qrLoading">
                🔄 刷新二维码
              </button>
              <p style="font-size:12px;color:var(--text-mute);text-align:center;margin-top:10px">支付完成后页面将自动跳转</p>
            </div>

            <p style="text-align:center;margin-top:14px" v-if="payState==='fail' || payState==='closed'">
              <a class="text-link" @click="startPay(newOrder.order_no)">🔄 重新生成二维码</a>
              <span style="color:var(--text-mute);margin:0 8px">|</span>
              <a class="text-link" @click="selectedTpl=null">稍后支付</a>
            </p>
            <p style="text-align:center;margin-top:14px" v-else-if="payState!=='success'">
              <a class="text-link" @click="selectedTpl=null">取消并稍后支付</a>
            </p>
          </div>

          <!-- 步骤4: 完成 -->
          <div v-if="purchaseStep === 4" class="done-page">
            <div class="done-icon">✅</div>
            <h3>支付成功！</h3>
            <p>订单号：<strong class="order-no">{{ newOrder.order_no }}</strong></p>
            <p style="margin-top:8px;color:var(--text-light)">
              微信支付已到账，客服确认后可通过订单号获取下载链接。
              <br>如有疑问请联系客服
            </p>
            <button class="btn btn-primary" style="margin-top:24px" @click="closePurchase">← 返回模板商城</button>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const API = axios.create({ baseURL: '' });

const templates = ref([]);
const categories = ref([]);
const filterCategory = ref('');

const selectedTpl = ref(null);
const purchaseStep = ref(1);
const purchasing = ref(false);
const newOrder = ref({});
const purchaseForm = ref({ name: '', phone: '', email: '', remark: '' });
const payState = ref('idle'); // idle/creating/oauth/paying/success/needWechat/fail/closed

function levelLabel(l) { return { standard: '基础版', pro: '专业版', enterprise: '至尊版' }[l] || l; }
function formatAmount(v) { return v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'; }
function truncate(s, n) { return s?.length > n ? s.slice(0, n) + '...' : s || ''; }
function onImgError(e) {
  if (e.target.dataset.errFixed) return;
  e.target.dataset.errFixed = '1';
  e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22250%22 viewBox=%220 0 400 250%22%3E%3Crect width=%22400%22 height=%22250%22 fill=%22%23F1F5F9%22 rx=%228%22/%3E%3Crect x=%22150%22 y=%2265%22 width=%22100%22 height=%22100%22 rx=%2216%22 fill=%22%23CBD5E1%22/%3E%3Cpath d=%22M170 125h60M195 80v70%22 stroke=%22%2394A3B8%22 stroke-width=%224%22 stroke-linecap=%22round%22/%3E%3Ctext x=%22130%22 y=%22210%22 font-size=%2214%22 fill=%22%2394A3B8%22 font-family=%22sans-serif%22 text-anchor=%22middle%22%3E%E6%A8%A1%E6%9D%BF%E9%A2%84%E8%A7%88%E5%9B%BE%3C/text%3E%3C/svg%3E';
}

async function loadTemplates() {
  try {
    const params = {};
    if (filterCategory.value) params.category = filterCategory.value;
    const { data } = await API.get('/api/templates', { params });
    if (data.code === 0) {
      templates.value = data.data;
      categories.value = [...new Set(data.data.map(t => t.category).filter(Boolean))];
    }
  } catch(e) {}
}

function selectTemplate(tpl) {
  selectedTpl.value = tpl;
  purchaseStep.value = 1;
  purchaseForm.value = { name: '', phone: '', email: '', remark: '' };
  newOrder.value = {};
}

async function doPurchase() {
  if (!purchaseForm.value.name || !purchaseForm.value.phone) { alert('请填写姓名和手机号'); return; }
  purchasing.value = true;
  try {
    const { data } = await API.post(`/api/templates/${selectedTpl.value.slug}/purchase`, {
      customer_name: purchaseForm.value.name,
      customer_phone: purchaseForm.value.phone,
      customer_email: purchaseForm.value.email,
      customer_remark: purchaseForm.value.remark
    });
    if (data.code === 0) { newOrder.value = data.data; purchaseStep.value = 3; startPay(data.data.order_no); }
    else { alert(data.message); }
  } catch(e) { alert('创建订单失败'); }
  finally { purchasing.value = false; }
}

// ===== 微信扫码支付（Native：页面直接显示二维码，微信扫码支付）=====
const payStateTextMap = {
  idle: '待支付', creating: '待支付', paying: '待支付',
  success: '已支付', fail: '生成失败', closed: '已关闭'
};
const payStateText = computed(() => payStateTextMap[payState.value] || '待支付');

function isWechat() { return /MicroMessenger/i.test(navigator.userAgent); }

const qrDataUrl = ref('');
const qrLoading = ref(false);

let pollTimer = null;
function startPoll(orderNo) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const { data } = await API.get(`/api/payment/status/${orderNo}`);
      if (data.code === 0 && data.data.status >= 1) {
        clearInterval(pollTimer);
        payState.value = 'success';
        purchaseStep.value = 4;
      }
    } catch(e) {}
  }, 2000);
}

async function startPay(orderNo) {
  if (!orderNo) return;
  // 微信内：跳统一支付网关支付页（静默授权 + JSAPI 拉起支付，免扫码）
  if (isWechat()) {
    payState.value = 'paying';
    window.location.href = 'https://pay.openai2000.cn/pay/hz?order_no=' + encodeURIComponent(orderNo);
    return;
  }
  // PC / 手机浏览器：页面内 Native 二维码扫码支付
  payState.value = 'creating';
  qrLoading.value = true;
  qrDataUrl.value = '';
  try {
    const r = await API.post('/api/payment/native', { order_no: orderNo });
    if (r.data.code !== 0 || !r.data.data) { payState.value = 'fail'; return; }
    if (r.data.data.already_paid) { payState.value = 'success'; purchaseStep.value = 4; return; }
    qrDataUrl.value = r.data.data.qr_data_url;
    payState.value = 'paying';
    startPoll(orderNo);
  } catch(e) { payState.value = 'fail'; }
  finally { qrLoading.value = false; }
}

async function checkPayment() {
  // 兼容旧入口：直接进入轮询
  startPoll(newOrder.value.order_no);
}

async function loadOrderStatus() {
  try {
    const { data } = await API.get(`/api/templates/order/${newOrder.value.order_no}`);
    if (data.code === 0 && data.data.status === 'paid') {
      purchaseStep.value = 4;
    } else {
      alert('订单状态：' + (data.data?.status_text || '待支付'));
    }
  } catch(e) { alert('查询失败'); }
}

function closePurchase() { selectedTpl.value = null; purchaseStep.value = 1; }

async function loadConfig() {
  try {
    await API.get('/api/config');
  } catch(e) {}
}

onMounted(async () => {
  loadTemplates();
  loadConfig();
  // 从统一支付网关支付页跳回：?pay=order_no（支付成功自动跳回）→ 轮询确认订单状态
  const params = new URLSearchParams(window.location.search);
  const payNo = params.get('pay');
  if (payNo) {
    try {
      const { data } = await API.get(`/api/payment/status/${payNo}`);
      if (data.code === 0) {
        newOrder.value = {
          order_no: payNo,
          template_name: data.data.name || '',
          amount: data.data.amount || 0,
          status: data.data.status
        };
        purchaseStep.value = 3;
        if (data.data.status >= 1) { payState.value = 'success'; purchaseStep.value = 4; }
        else { startPay(payNo); } // 未支付：重新跳转支付页
      }
    } catch(e) {}
  }
});
</script>

<style scoped>
/* Hero */
.shop-hero {
  background: linear-gradient(135deg, var(--primary-dark), var(--primary), var(--accent-2));
  padding: 64px 0 48px; text-align: center; color: white;
  position: relative; overflow: hidden;
}
.shop-hero::after {
  content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}
.shop-hero .section-tag {
  display: inline-block; padding: 4px 14px; border-radius: 999px;
  background: rgba(255,255,255,0.15); font-size: 12px; font-weight: 600;
  letter-spacing: 2px; margin-bottom: 16px;
}
.shop-hero h1 { font-size: 40px; font-weight: 800; margin-bottom: 12px; }
.shop-hero p { font-size: 17px; opacity: 0.85; }

.shop-body { padding: 40px 0 80px; }

/* 筛选按钮 */
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 32px; }
.filter-btn {
  padding: 8px 20px; border-radius: 999px;
  border: 1px solid var(--border); background: white;
  font-size: 14px; color: var(--text-soft); cursor: pointer;
  transition: all 0.2s;
}
.filter-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
.filter-btn:hover:not(.active) { border-color: var(--primary-light); color: var(--primary); }

/* 卡片网格 */
.tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
@media (max-width: 1024px) { .tpl-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .tpl-grid { grid-template-columns: 1fr; } }
.tpl-card {
  background: white; border-radius: var(--radius-lg);
  overflow: hidden; cursor: pointer;
  border: 1px solid var(--border);
  transition: all 0.3s; position: relative;
}
.tpl-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: transparent; }
.tpl-badge {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  padding: 4px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
}
.badge-standard { background: rgba(30, 64, 175, 0.1); color: var(--primary); }
.badge-pro { background: rgba(139, 92, 246, 0.1); color: var(--accent-2); }
.badge-enterprise { background: rgba(245, 158, 11, 0.1); color: #D97706; }
.badge-level { font-weight: 600; }
.badge-price { color: #DC2626; font-weight: 800; font-size: 13px; }
.tpl-cover {
  height: 200px; background: var(--bg-soft);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.tpl-cover img { width: 100%; height: 100%; object-fit: cover; }
.tpl-info { padding: 20px; }
.tpl-info h3 { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.tpl-info p { font-size: 14px; color: var(--text-light); line-height: 1.6; margin-bottom: 16px; min-height: 44px; }
.tpl-actions { display: flex; align-items: center; gap: 12px; }
.tpl-action { font-size: 14px; font-weight: 600; color: var(--primary); cursor: pointer; }
.tpl-action:hover { text-decoration: underline; }
.tpl-demo-btn { font-size: 13px; color: var(--text-light); text-decoration: none; border: 1px solid var(--border-color, #e0e0e0); padding: 4px 12px; border-radius: 6px; transition: all .2s; }
.tpl-demo-btn:hover { border-color: var(--primary); color: var(--primary); }

/* 弹窗 */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; padding: 24px;
}
.modal-panel {
  background: white; border-radius: var(--radius-lg);
  padding: 40px; width: 100%; max-width: 640px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.2);
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h2 { font-size: 22px; font-weight: 700; }
.close-btn { font-size: 24px; cursor: pointer; color: var(--text-mute); }
.close-btn:hover { color: var(--text); }
.modal-desc { color: var(--text-soft); line-height: 1.7; margin-bottom: 20px; }
.feature-list { margin-bottom: 16px; }
.feature-list h4 { font-size: 15px; margin-bottom: 10px; }
.feature-list ul { list-style: none; padding: 0; }
.feature-list li { padding: 6px 0 6px 24px; position: relative; color: var(--text-soft); font-size: 14px; }
.feature-list li::before { content: '✅'; position: absolute; left: 0; font-size: 14px; }
.price-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 0; border-top: 1px solid var(--border); margin-bottom: 20px;
}
.price-row span { font-weight: 600; }
.price-row strong { font-size: 28px; font-weight: 800; color: #DC2626; }

/* 订单摘要 */
.order-summary {
  background: var(--bg-soft); border-radius: var(--radius);
  padding: 16px 20px; margin-bottom: 20px;
}
.summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
.summary-row:last-child { border-bottom: none; }
.summary-row span { font-size: 14px; color: var(--text-light); }
.summary-row strong { font-size: 14px; color: var(--text); }
.order-no { font-family: monospace; letter-spacing: 1px; color: var(--primary) !important; }
.status-tag { padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.status-tag.warn { background: rgba(245,158,11,0.1); color: #D97706; }
.status-tag.ok { background: rgba(16,185,129,0.1); color: #059669; }
.pay-spinner { display: inline-block; animation: hz-spin 1.2s linear infinite; }
@keyframes hz-spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }

/* 微信支付面板 */
.pay-panel {
  text-align: center; margin-bottom: 20px;
  padding: 24px; border-radius: var(--radius);
  background: var(--bg-soft);
}
.pay-panel h4 { font-size: 18px; }
.wx-qr-box {
  display: inline-block; background: white;
  padding: 16px; border-radius: var(--radius);
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.wx-qr-box img { width: 200px; height: 200px; object-fit: contain; }
.qr-loading { width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-mute); font-size: 14px; }

/* 完成页 */
.done-page { text-align: center; padding: 32px 0; }
.done-icon {
  width: 64px; height: 64px; border-radius: 16px;
  background: linear-gradient(135deg, #059669, #10B981);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; margin: 0 auto 16px;
}
.done-page h3 { font-size: 22px; margin-bottom: 8px; }

.empty-state { text-align: center; padding: 80px 0; color: var(--text-mute); }
.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }

.text-link { cursor: pointer; color: var(--primary); font-size: 14px; }
.text-link:hover { text-decoration: underline; }

/* 表单 */
:deep(.form-group) { margin-bottom: 16px; }
:deep(.form-group label) { display: block; font-size: 14px; margin-bottom: 6px; font-weight: 500; }
:deep(.form-group input),
:deep(.form-group select),
:deep(.form-group textarea) {
  width: 100%; padding: 10px 14px; border: 1px solid var(--border);
  border-radius: var(--radius); font-size: 14px; font-family: inherit;
  transition: border-color 0.2s;
}
:deep(.form-group input:focus),
:deep(.form-group textarea:focus) { outline: none; border-color: var(--primary); }
</style>

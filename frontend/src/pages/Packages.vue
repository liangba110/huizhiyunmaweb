<template>
  <div class="packages-page">
    <!-- 顶部横幅 -->
    <div class="page-banner">
      <div class="container">
<h1>软件开发套餐 · 明码标价</h1>
        <p>按行业标准化配置，明码标价，在线直接选，无需繁琐定制</p>
        <div class="banner-tags">
<span>🔴 按行业标准化配置</span>
          <span>📦 标准套餐快速交付</span>
          <span>💯 源码交付终身维护</span>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- 业务类型切换 -->
      <div class="biz-switch">
        <button
          v-for="b in bizTypes"
          :key="b.key"
          class="biz-btn"
          :class="{ active: activeBiz === b.key }"
          @click="switchBiz(b.key)"
        >
          <span class="biz-icon">{{ b.icon }}</span>
          <span class="biz-name">{{ b.name }}</span>
          <span class="biz-sub">{{ b.desc }}</span>
        </button>
      </div>

      <!-- 行业筛选 -->
      <div class="industry-filter">
        <span class="filter-label">行业：</span>
        <button
          v-for="ind in industries"
          :key="ind"
          class="filter-chip"
          :class="{ active: activeIndustry === ind }"
          @click="activeIndustry = ind"
        >{{ ind }}</button>
      </div>

      <!-- 套餐列表 -->
      <div v-if="loading" class="loading">加载套餐中...</div>
      <div v-else-if="packages.length === 0" class="empty">该分类暂无套餐</div>
      <div v-else class="package-grid">
        <div
          v-for="(pkg, i) in packages"
          :key="pkg.id"
          class="package-card"
          :class="[pkg.level, { featured: pkg.level === 'flagship' }]"
        >
          <div v-if="pkg.level === 'pro'" class="level-badge">🔥 热销</div>
          <div v-if="pkg.level === 'flagship'" class="level-badge">👑 旗舰</div>
          <div class="pkg-head">
            <div class="pkg-name">{{ pkg.name }}</div>
            <div class="pkg-save">省 ¥{{ pkg.original_price - pkg.price }}</div>
          </div>
          <div class="pkg-price">
            <span class="price-cur">¥</span>{{ pkg.price.toLocaleString() }}
            <span class="price-orig">¥{{ pkg.original_price.toLocaleString() }}</span>
          </div>
          <div class="pkg-delivery">⚡ 最快 {{ pkg.delivery_days }} 天交付</div>
          <ul class="pkg-features">
            <li v-for="(f, fi) in getFeatures(pkg.features)" :key="fi">✅ {{ f }}</li>
          </ul>
          <button class="pkg-order-btn" @click="openOrder(pkg)">立即下单</button>
        </div>
      </div>

      <!-- 定制需求入口 -->
      <div class="custom-entry">
        <div class="custom-info">
          <h3>有特殊需求，需要定制开发？</h3>
          <p>我们也提供定制开发服务，点击咨询技术顾问，免费获取方案和报价。</p>
        </div>
        <button class="custom-btn" @click="$router.push('/contact')">👉 咨询定制需求</button>
      </div>
    </div>

    <!-- 下单弹窗 -->
    <div v-if="showOrderForm" class="modal-mask" @click.self="closeOrder">
      <div class="order-modal">
        <button class="modal-close" @click="closeOrder">✕</button>
        <div class="order-title">确认下单</div>
        <div class="order-pkg">
          <div class="order-pkg-name">{{ selectedPkg.name }}</div>
          <div class="order-pkg-price">¥{{ selectedPkg.price.toLocaleString() }}</div>
        </div>
        <form @submit.prevent="submitOrder">
          <div class="form-group">
            <label>您的称呼 <span class="req">*</span></label>
            <input v-model="orderForm.name" required maxlength="20" placeholder="请输入姓名">
          </div>
          <div class="form-group">
            <label>联系电话 <span class="req">*</span></label>
            <input v-model="orderForm.phone" required maxlength="20" placeholder="请输入手机号">
          </div>
          <div class="form-group">
            <label>微信（选填）</label>
            <input v-model="orderForm.wechat" maxlength="50" placeholder="微信号，方便联系">
          </div>
          <div class="form-group">
            <label>备注（您的具体需求）</label>
            <textarea v-model="orderForm.remark" rows="3" placeholder="例如：做餐饮品牌官网，需要在线点餐功能"></textarea>
          </div>
          <div class="form-group">
            <label>支付方式</label>
            <div class="pay-options">
              <label class="pay-opt"><input type="radio" value="wechat" v-model="orderForm.pay_method"> 微信</label>
              <label class="pay-opt"><input type="radio" value="alipay" v-model="orderForm.pay_method"> 支付宝</label>
            </div>
          </div>
          <button type="submit" class="order-submit" :disabled="orderSubmitting">
            {{ orderSubmitting ? '提交中...' : '确认下单 ¥' + selectedPkg.price.toLocaleString() }}
          </button>
          <p class="order-note">提交后技术顾问会联系您确认并安排交付</p>
        </form>
      </div>
    </div>

    <!-- 下单成功提示（显示微信支付二维码） -->
    <div v-if="orderSuccess" class="modal-mask" @click.self="closeSuccess">
      <div class="success-modal">
        <button class="modal-close" @click="closeSuccess">✕</button>
        <div class="success-icon">{{ payState === 'success' ? '✅' : '💚' }}</div>
        <div class="success-title">{{ payState === 'success' ? '支付成功！' : '下单成功！' }}</div>
        <template v-if="payState !== 'success'">
          <p style="font-size:13px;color:#666;margin-bottom:14px">请使用<strong>微信扫一扫</strong>扫描下方二维码完成支付</p>
          <div style="display:inline-block;background:#fff;padding:14px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <img v-if="qrDataUrl" :src="qrDataUrl" style="width:200px;height:200px;display:block" alt="微信支付二维码">
            <div v-else style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px">⏳ 二维码生成中...</div>
          </div>
          <p class="success-order" style="margin-top:10px">订单号：<strong>{{ lastOrderNo }}</strong></p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
            <button class="success-btn" @click="startPay(lastOrderNo)" :disabled="qrLoading">🔄 刷新二维码</button>
            <button class="success-btn success-btn-ghost" @click="closeSuccess">稍后支付</button>
          </div>
          <p style="font-size:12px;color:#999;margin-top:10px">支付完成后将自动确认</p>
        </template>
        <template v-else>
          <p>微信支付已到账，技术顾问将尽快与您联系安排交付。</p>
          <p class="success-order">订单号：<strong>{{ lastOrderNo }}</strong></p>
          <button class="success-btn" @click="closeSuccess">好的</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

const bizTypes = [
  { key: 'website', name: '网站建设', icon: '🌐', desc: '企业官网/电商' },
  { key: 'miniapp', name: '小程序', icon: '📱', desc: '微信小程序' },
  { key: 'app', name: 'APP开发', icon: '📲', desc: 'iOS/安卓' },
];

const activeBiz = ref('website');
const activeIndustry = ref('通用');
const industries = ref(['通用']);
const packages = ref([]);
const loading = ref(false);

const showOrderForm = ref(false);
const selectedPkg = ref(null);
const orderForm = ref({ name: '', phone: '', wechat: '', remark: '', pay_method: 'wechat' });
const orderSubmitting = ref(false);
const orderSuccess = ref(false);
const lastOrderNo = ref('');
const payState = ref('idle'); // idle/creating/oauth/paying/success/needWechat/fail/closed

// 行业映射（保证通用在最后）
const industryOrder = { '电商': 1, '餐饮': 2, '美容预约': 3, '教育': 4, '同城服务': 5, '通用': 6 };

async function loadPackages() {
  loading.value = true;
  try {
    const params = { biz_type: activeBiz.value };
    if (activeIndustry.value !== '通用') params.industry = activeIndustry.value;
    const { data } = await axios.get('/api/packages', { params });
    if (data.code === 0) {
      packages.value = data.data;
    }
  } catch (e) {
    packages.value = [];
  }
  loading.value = false;
}

async function loadIndustries() {
  try {
    const { data } = await axios.get('/api/packages/industries');
    if (data.code === 0) {
      industries.value = data.data.filter(i => i !== '通用');
      industries.value.push('通用');
    }
  } catch (e) {}
}

function switchBiz(key) {
  activeBiz.value = key;
}

function getFeatures(features) {
  if (!features) return [];
  try {
    const arr = JSON.parse(features);
    return Array.isArray(arr) ? arr.slice(0, 6) : [];
  } catch (e) {
    return String(features).split('|').filter(Boolean).slice(0, 6);
  }
}

function openOrder(pkg) {
  selectedPkg.value = pkg;
  showOrderForm.value = true;
}

function closeOrder() {
  showOrderForm.value = false;
}

async function submitOrder() {
  if (!orderForm.value.name || !orderForm.value.phone) return;
  orderSubmitting.value = true;
  try {
    const { data } = await axios.post('/api/packages/order', {
      package_id: selectedPkg.value.id,
      name: orderForm.value.name,
      phone: orderForm.value.phone,
      wechat: orderForm.value.wechat,
      remark: orderForm.value.remark,
      pay_method: orderForm.value.pay_method,
    });
    if (data.code === 0) {
      lastOrderNo.value = data.order_no;
      showOrderForm.value = false;
      orderSuccess.value = true;
      orderForm.value = { name: '', phone: '', wechat: '', remark: '', pay_method: 'wechat' };
      startPay(data.order_no);
    } else {
      alert(data.msg || '下单失败');
    }
  } catch (e) {
    alert('下单失败，请稍后再试');
  }
  orderSubmitting.value = false;
}

// ===== 双轨支付：微信内跳网关JSAPI拉起；PC/浏览器Native二维码扫码 =====
function isWechat() { return /MicroMessenger/i.test(navigator.userAgent); }
const qrDataUrl = ref('');
const qrLoading = ref(false);

let pollTimer = null;
function startPoll(orderNo) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const { data } = await axios.get(`/api/payment/status/${orderNo}`);
      if (data.code === 0 && data.data.status >= 1) {
        clearInterval(pollTimer);
        payState.value = 'success';
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
    const r = await axios.post('/api/payment/native', { order_no: orderNo });
    if (r.data.code !== 0 || !r.data.data) { payState.value = 'fail'; return; }
    if (r.data.data.already_paid) { payState.value = 'success'; return; }
    qrDataUrl.value = r.data.data.qr_data_url;
    payState.value = 'paying';
    startPoll(orderNo);
  } catch(e) { payState.value = 'fail'; }
  finally { qrLoading.value = false; }
}

function closeSuccess() {
  orderSuccess.value = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

onMounted(() => {
  loadIndustries();
  // 支持 URL 参数定位：?biz=miniapp&industry=电商
  const params = new URLSearchParams(window.location.search);
  const biz = params.get('biz');
  const ind = params.get('industry');
  if (biz && bizTypes.some(b => b.key === biz)) activeBiz.value = biz;
  if (ind) activeIndustry.value = ind;
  loadPackages();
  // 从统一支付网关支付页跳回：?pay=order_no（支付成功自动跳回）→ 轮询确认订单状态
  const payNo = params.get('pay');
  if (payNo) {
    lastOrderNo.value = payNo;
    orderSuccess.value = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/payment/status/${payNo}`);
        if (data.code === 0 && data.data.status >= 1) { payState.value = 'success'; }
        else { startPay(payNo); } // 未支付：重新跳转支付页
      } catch(e) { startPay(payNo); }
    })();
  }
});

watch(activeBiz, loadPackages);
watch(activeIndustry, loadPackages);
</script>

<style scoped>
.packages-page { min-height: 100vh; background: #f8fafc; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

.page-banner { background: linear-gradient(135deg, #064e3b, #0d9488); color: #fff; padding: 60px 0; text-align: center; }
.page-banner h1 { font-size: 34px; margin: 0 0 12px; }
.page-banner p { font-size: 17px; opacity: .9; margin: 0 0 20px; }
.banner-tags { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.banner-tags span { background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 20px; font-size: 13px; }

.biz-switch { display: flex; gap: 14px; margin: 32px 0 20px; }
.biz-btn { flex: 1; padding: 18px; border: 2px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; text-align: center; transition: all .2s; }
.biz-btn:hover { border-color: #0d9488; transform: translateY(-2px); }
.biz-btn.active { border-color: #0d9488; background: #f0fdfa; box-shadow: 0 4px 12px rgba(13,148,136,.15); }
.biz-icon { font-size: 30px; display: block; margin-bottom: 6px; }
.biz-name { font-weight: 700; font-size: 17px; display: block; color: #1f2937; }
.biz-sub { font-size: 12px; color: #64748b; }

.industry-filter { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.filter-label { font-weight: 600; color: #475569; }
.filter-chip { padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 20px; background: #fff; cursor: pointer; font-size: 14px; color: #475569; }
.filter-chip.active { background: #0d9488; color: #fff; border-color: #0d9488; }

.loading, .empty { text-align: center; padding: 60px; color: #94a3b8; }
.package-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }

.package-card { background: #fff; border-radius: 14px; padding: 24px; position: relative; border: 1px solid #e2e8f0; transition: all .2s; }
.package-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,.08); }
.package-card.flagship { border: 2px solid #f59e0b; }
.package-card.pro .pkg-order-btn { background: #0d9488; }
.package-card.flagship .pkg-order-btn { background: #f59e0b; }
.level-badge { position: absolute; top: -12px; right: 16px; background: #ef4444; color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 6px; font-weight: 600; }
.package-card.flagship .level-badge { background: #f59e0b; }

.pkg-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.pkg-name { font-size: 18px; font-weight: 700; color: #111827; }
.pkg-save { font-size: 12px; color: #059669; background: #ecfdf5; padding: 3px 8px; border-radius: 4px; font-weight: 600; }
.pkg-price { margin-bottom: 8px; }
.price-cur { font-size: 20px; color: #dc2626; font-weight: 700; }
.pkg-price { font-size: 34px; font-weight: 800; color: #dc2626; }
.price-orig { font-size: 15px; color: #94a3b8; text-decoration: line-through; margin-left: 8px; font-weight: 400; }
.pkg-delivery { font-size: 13px; color: #0d9488; background: #f0fdfa; display: inline-block; padding: 3px 8px; border-radius: 4px; margin-bottom: 14px; }
.pkg-features { list-style: none; padding: 0; margin: 0 0 18px; }
.pkg-features li { padding: 6px 0; font-size: 14px; color: #334155; border-bottom: 1px dashed #f1f5f9; }
.pkg-order-btn { width: 100%; padding: 13px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity .2s; }
.pkg-order-btn:hover { opacity: .9; }

.custom-entry { margin: 36px 0 60px; background: linear-gradient(135deg, #1e293b, #334155); border-radius: 14px; padding: 30px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.custom-info h3 { color: #fff; margin: 0 0 6px; font-size: 20px; }
.custom-info p { color: #cbd5e1; margin: 0; font-size: 14px; }
.custom-btn { padding: 12px 28px; background: #f59e0b; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
.custom-btn:hover { opacity: .9; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.order-modal { background: #fff; border-radius: 14px; padding: 32px; width: 100%; max-width: 460px; position: relative; max-height: 90vh; overflow-y: auto; }
.modal-close { position: absolute; top: 14px; right: 14px; background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; }
.order-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #111827; }
.order-pkg { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
.order-pkg-name { font-weight: 600; color: #065f46; }
.order-pkg-price { font-size: 20px; font-weight: 700; color: #dc2626; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 13px; color: #475569; margin-bottom: 5px; font-weight: 500; }
.form-group .req { color: #ef4444; }
.form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
.pay-options { display: flex; gap: 16px; }
.pay-opt { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #334155; cursor: pointer; }
.order-submit { width: 100%; padding: 13px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.order-submit:disabled { opacity: .5; }
.order-note { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 12px; }

.success-modal { background: #fff; border-radius: 14px; padding: 40px; text-align: center; max-width: 400px; position: relative; max-height: 90vh; overflow-y: auto; }
.success-icon { font-size: 60px; margin-bottom: 12px; }
.success-title { font-size: 22px; font-weight: 700; color: #059669; margin-bottom: 12px; }
.success-modal p { color: #475569; font-size: 14px; }
.success-order { color: #64748b; }
.success-btn { margin-top: 18px; padding: 11px 40px; background: #059669; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
.success-btn:disabled { opacity: .5; cursor: not-allowed; }
.success-btn-ghost { background: #e2e8f0; color: #475569; margin-top: 18px; }
</style>

<template>
  <div class="contact-page">
    <ParticleBanner density="low">
      <h1 class="reveal visible">联系咨询</h1>
      <p class="reveal visible">免费获取专属方案与报价 · 24 小时内回复</p>
    </ParticleBanner>

    <section class="section">
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info reveal">
            <h2>为什么选择我们？</h2>
            <ul class="benefits">
              <li>✓ 200+ 真实案例可参观</li>
              <li>✓ 资深技术团队，5 年+ 经验</li>
              <li>✓ 源码 100% 交付，无任何锁定</li>
              <li>✓ 透明报价，无隐藏费用</li>
              <li>✓ 1 年免费维护，终身技术支持</li>
              <li>✓ 分阶段付款，降低风险</li>
            </ul>

            <div class="info-block">
              <div class="info-icon">📞</div>
              <div>
                <h4>电话咨询</h4>
                <p class="big">
                  <span v-if="!phoneRevealed" class="phone-mask" @click="revealPhone">点击获取联系方式 🔒</span>
                  <a v-else :href="'tel:' + companyPhoneRaw" class="phone-full">{{ companyPhone }}</a>
                </p>
              </div>
            </div>
            <div class="info-block">
              <div class="info-icon">💬</div>
              <div>
                <h4>微信咨询</h4>
                <img :src="'/uploads/wechat_qr.png'" alt="微信二维码" style="width:150px; height:150px; border-radius:8px;">
              </div>
            </div>
            <div class="info-block">
              <div class="info-icon">📧</div>
              <div>
                <h4>邮件咨询</h4>
                <p>{{ company.company_email || 'business@huizhiyunma.com' }}</p>
              </div>
            </div>
            <div class="info-block">
              <div class="info-icon">📍</div>
              <div>
                <h4>公司地址</h4>
                <p>{{ company.company_address || '山东省青岛市胶州市阜安街道东关大街8号中央公园写字楼11楼办公室' }}</p>
              </div>
            </div>
          </div>

          <div class="contact-form-wrap reveal">
            <h2>留下您的需求</h2>
            <p class="form-intro">提交后我们将在 24 小时内与您联系</p>
            <form @submit.prevent="submit" class="contact-form">
              <div class="form-group">
                <label>您的姓名 <span class="required">*</span></label>
                <input v-model="form.name" required maxlength="20" placeholder="请输入您的姓名">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>联系电话 <span class="required">*</span></label>
                  <input v-model="form.phone" required maxlength="20" placeholder="请输入手机号">
                </div>
                <div class="form-group">
                  <label>邮箱</label>
                  <input v-model="form.email" type="email" placeholder="可选">
                </div>
              </div>
              <div class="form-group">
                <label>公司名称</label>
                <input v-model="form.company" maxlength="50" placeholder="请输入公司名称">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>需要的服务</label>
                  <select v-model="form.service_type">
                    <option value="">请选择</option>
                    <option value="App 开发">App 定制开发</option>
                    <option value="小程序开发">小程序定制开发</option>
                    <option value="网站开发">网站 / 管理系统</option>
                    <option value="UI 设计">UI/UX 设计</option>
                    <option value="其他">其他需求</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>预算范围</label>
                  <select v-model="form.budget">
                    <option value="">请选择</option>
                    <option value="1万以下">1 万以下</option>
                    <option value="1-5万">1 - 5 万</option>
                    <option value="5-10万">5 - 10 万</option>
                    <option value="10-30万">10 - 30 万</option>
                    <option value="30万以上">30 万以上</option>
                    <option value="待定">待定</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>需求描述</label>
                <textarea v-model="form.message" rows="5" placeholder="请简要描述您的需求，例如：行业、功能、参考产品、上线时间等"></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
                {{ submitting ? '提交中...' : '立即提交，免费获取方案' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import ParticleBanner from '../components/ParticleBanner.vue';

const company = ref({});
const submitting = ref(false);
const phoneRevealed = ref(false);
const _p = ['187','6620','2024'];
const companyPhoneRaw = _p.join(''); // 分段存储防扫描，点击后展示/拨打
const companyPhone = _p.join('-');

function revealPhone() {
  phoneRevealed.value = true;
}
const form = reactive({
  name: '', phone: '', email: '', company: '',
  service_type: '', budget: '', message: ''
});

async function submit() {
  submitting.value = true;
  try {
    const { data } = await axios.post('/api/contacts', form);
    if (data.code === 0) {
      alert('提交成功！我们将尽快与您联系。');
      Object.keys(form).forEach(k => form[k] = '');
    } else {
      alert('提交失败：' + data.message);
    }
  } catch (e) {
    alert('网络错误，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  const { data } = await axios.get('/api/company');
  if (data.code === 0) company.value = data.data;
  setTimeout(initReveal, 100);
});

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
</script>

<style scoped>
.phone-mask {
  display: inline-block;
  padding: 6px 14px;
  background: linear-gradient(135deg,#1E40AF,#6D28D9);
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity .2s;
  user-select: none;
}
.phone-mask:hover { opacity: .85; }
.phone-full {
  color: #1E40AF;
  font-size: 22px;
  font-weight: 700;
  text-decoration: none;
}
.phone-full:hover { text-decoration: underline; }
.contact-page {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  min-height: 100vh;
}
.page-hero h1 {
  font-size: 48px; font-weight: 700;
  margin-bottom: 16px; letter-spacing: -1px;
  position: relative;
}
.page-hero p {
  font-size: 18px; opacity: 0.9;
  position: relative;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 56px;
}
.contact-info h2 {
  font-size: 28px; font-weight: 700;
  color: var(--text); margin-bottom: 20px;
  letter-spacing: -1px;
}
.benefits { margin-bottom: 32px; }
.benefits li {
  padding: 10px 0;
  font-size: 14px; color: var(--text-soft);
  border-bottom: 1px dashed var(--border);
  transition: padding-left 0.3s;
}
.benefits li:hover { padding-left: 8px; color: var(--primary); }

.info-block {
  display: flex; align-items: center; gap: 16px;
  padding: 16px;
  background: var(--bg-soft);
  border-radius: var(--radius);
  margin-bottom: 12px;
  transition: all 0.3s;
}
.info-block:hover {
  background: white;
  box-shadow: var(--shadow);
  transform: translateX(4px);
}
.info-icon {
  width: 44px; height: 44px;
  background: white;
  border-radius: var(--radius);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}
.info-block h4 {
  font-size: 12px; font-weight: 500;
  color: var(--text-mute);
  margin-bottom: 4px;
}
.info-block p {
  font-size: 14px; color: var(--text);
  font-weight: 500;
}
.info-block .big {
  font-size: 22px !important; font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.5px;
}

.contact-form-wrap {
  background: white;
  padding: 40px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.contact-form-wrap h2 {
  font-size: 28px; font-weight: 700;
  color: var(--text); margin-bottom: 8px;
  letter-spacing: -1px;
}
.form-intro {
  font-size: 14px; color: var(--text-light);
  margin-bottom: 28px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-group { margin-bottom: 18px; }
.form-group label {
  display: block; font-size: 13px; font-weight: 500;
  margin-bottom: 6px; color: var(--text);
}
.required { color: #EF4444; }
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px; font-family: inherit;
  transition: all 0.25s;
  background: var(--bg-soft);
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  background: white;
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.08);
}
.form-group textarea { resize: vertical; }

@media (max-width: 768px) {
  .contact-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .contact-form-wrap { padding: 28px; }
}
</style>
<template>
  <div class="home">
    <!-- 顶部滚动进度条 -->
    <div class="scroll-progress" :style="{ width: scrollProgress + '%' }"></div>

    <!-- ========== Hero ========== -->
    <section class="hero">
      <!-- Canvas 粒子网络背景 -->
      <canvas ref="particleCanvas" class="particle-canvas"></canvas>

      <!-- 装饰层 -->
      <div class="hero-bg">
        <div class="grid-bg"></div>
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
        <div class="glow glow-3"></div>
      </div>

      <div class="container hero-inner">
        <div class="hero-content reveal visible">
          <span class="badge">
            <span class="dot"></span>
            专业 App / 小程序定制开发
          </span>
          <h1>
            <span class="line">{{ company.company_name?.split('（')[0] || '汇智云码科技' }}</span>
            <span class="line gradient-text">让想法变成产品</span>
          </h1>
          <p class="hero-slogan">{{ company.company_slogan || '让企业拥有属于自己的 App 与小程序' }}</p>
          <p class="hero-desc">{{ company.company_intro?.slice(0, 100) || '专业团队 · 敏捷交付 · 源码透明 · 终身服务' }}...</p>
          <div class="hero-actions">
            <router-link to="/contact" class="btn btn-primary">
              免费咨询方案
              <span class="arrow">→</span>
            </router-link>
            <router-link to="/cases" class="btn btn-ghost">
              查看成功案例
            </router-link>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <strong>
                <span class="counter" :data-target="parseStat(company.stat_cases) || 200">0</span>+
              </strong>
              <span>成功案例</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <strong>
                <span class="counter" :data-target="parseStat(company.stat_clients) || 120">0</span>+
              </strong>
              <span>服务客户</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <strong>
                <span class="counter" :data-target="parseStat(company.stat_experience) || 8">0</span>年+
              </strong>
              <span>行业经验</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <strong>
                <span class="counter" :data-target="parseStat(company.stat_team) || 30">0</span>人
              </strong>
              <span>专业团队</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 鼠标位置指示 -->
      <div class="cursor-glow" :style="{ left: cursor.x + 'px', top: cursor.y + 'px' }"></div>
    </section>

    <!-- ========== 核心服务 ========== -->
    <section class="section services-section">
      <div class="container">
        <div class="section-title reveal">
          <span class="tag">OUR SERVICES</span>
          <h2>专业的<span class="highlight">全栈开发</span>能力</h2>
          <p>从需求到上线，为您提供端到端的技术解决方案</p>
        </div>
        <div class="services-grid">
          <div
            v-for="(s, idx) in services"
            :key="s.id"
            class="service-card reveal"
            :style="`transition-delay: ${idx * 80}ms`"
            @mousemove="tiltCard($event, $refs['card' + s.id][0])"
            @mouseleave="resetTilt($refs['card' + s.id][0])"
          >
            <div :ref="'card' + s.id" class="card-3d">
              <div class="service-icon">{{ s.icon }}</div>
              <h3>{{ rc(s.title) }}</h3>
              <p class="service-subtitle">{{ rc(s.subtitle) }}</p>
              <p class="service-desc">{{ s.description }}</p>
              <div class="service-features">
                <span v-for="f in (s.features||'').split('|').filter(Boolean).slice(0, 4)" :key="f" class="tag">{{ f }}</span>
              </div>
              <div class="service-price">
                <span class="price-label">参考报价</span>
                <span class="price-range">¥{{ formatPrice(s.price_min) }} 起</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 标准流程 ========== -->
    <section class="section process-section">
      <div class="container">
        <div class="section-title reveal">
          <span class="tag">PROCESS</span>
          <h2>6 步走完<span class="highlight">全流程</span></h2>
          <p>透明、高效、有保障的标准开发流程</p>
        </div>
        <div class="process-grid">
          <div v-for="(step, idx) in steps" :key="idx" class="process-step reveal" :style="`transition-delay: ${idx * 100}ms`">
            <div class="step-num">{{ String(idx + 1).padStart(2, '0') }}</div>
            <h4>{{ step.title }}</h4>
            <p>{{ step.desc }}</p>
            <div v-if="idx < steps.length - 1" class="step-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 客户案例预览 ========== -->
    <section class="section cases-preview">
      <div class="container">
        <div class="section-title reveal">
          <span class="tag">PORTFOLIO</span>
          <h2>精选<span class="highlight">合作案例</span></h2>
          <p>已为来自各行业的 120+ 企业客户提供专业的解决方案</p>
        </div>
        <div class="cases-grid">
          <router-link
            v-for="(c, idx) in cases.slice(0, 6)"
            :key="c.id"
            :to="`/cases/${c.id}`"
            class="case-card reveal"
            :style="`transition-delay: ${idx * 80}ms`"
          >
            <div class="case-cover" :style="{ background: getGradient(c.id) }">
              <span class="case-cat">{{ c.category }}</span>
              <span class="case-icon">{{ getCategoryIcon(c.category) }}</span>
            </div>
            <div class="case-body">
              <h3>{{ c.title }}</h3>
              <p class="case-desc">{{ c.description }}</p>
              <span class="case-link">查看详情 →</span>
            </div>
          </router-link>
        </div>
        <div class="text-center reveal" style="margin-top: 48px;">
          <router-link to="/cases" class="btn btn-outline">查看更多案例</router-link>
        </div>
      </div>
    </section>

    <!-- ========== 模板商城 ========== -->
    <section class="section shop-section">
      <div class="container">
        <div class="section-title reveal">
          <span class="tag">TEMPLATES</span>
          <h2>在线<span class="highlight">模板商城</span></h2>
          <p>精选企业级网站模板，购买后源码交付，支持二次开发</p>
        </div>
        <div class="shop-cards reveal">
          <div class="shop-level" @click="goToShop">
            <span class="shop-icon">🥇</span>
            <h3>基础版</h3>
            <span class="shop-price">¥{{ templatePrice('standard') }}</span>
            <p>模板交付，自行配置</p>
            <span class="shop-btn">去购买 →</span>
          </div>
          <div class="shop-level pro" @click="goToShop">
            <span class="shop-icon">🥈</span>
            <h3>专业版</h3>
            <span class="shop-price">¥{{ templatePrice('pro') }}</span>
            <p>含高级功能+文档</p>
            <span class="shop-btn">去购买 →</span>
          </div>
          <div class="shop-level enterprise" @click="goToShop">
            <span class="shop-icon">🥇</span>
            <h3>至尊版</h3>
            <span class="shop-price">¥{{ templatePrice('enterprise') }}</span>
            <p>含一对一配置服务</p>
            <span class="shop-btn">去购买 →</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== CTA ========== -->
    <!-- ========== 免费资料 ========== -->
    <section class="section free-section" id="free-resource">
      <div class="container">
        <div class="free-card reveal">
          <div class="free-left">
            <span class="tag">FREE RESOURCE</span>
            <h2>免费领取<span class="highlight">《2026 企业开发需求梳理与报价模板》</span></h2>
            <p>包含需求沟通清单、报价构成表、避坑指南与合作流程，填写邮箱立即获取。</p>
          </div>
          <div class="free-right">
            <form class="free-form" @submit.prevent="claimFreeResource">
              <input v-model="freeEmail" type="email" required placeholder="请输入常用邮箱（如 xx@qq.com）" :disabled="freeSending">
              <button class="btn btn-primary" type="submit" :disabled="freeSending">{{ freeSending ? '发送中...' : '免费领取' }}</button>
            </form>
            <p v-if="freeDone" class="free-msg success">{{ freeDone }}</p>
            <p v-else-if="freeError" class="free-msg error">{{ freeError }}</p>
          </div>
        </div>
      </div>
    </section>
    <section class="cta-section">
      <div class="container">
        <div class="cta-content reveal">
          <h2>让您的想法成为下一个爆款</h2>
          <p>留下您的需求，24 小时内获得免费方案与报价</p>
          <div class="cta-actions">
            <router-link to="/contact" class="btn btn-primary">立即咨询</router-link>
            <span class="btn btn-ghost-light"><svg viewBox="0 0 1024 1024" width="18" height="18" style="vertical-align:middle; margin-right:4px;"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12B7F5"/><path d="M683.008 503.808c-1.024 15.872-12.288 86.016-70.144 129.536l77.312 86.528c4.096 4.608 6.144 10.24 5.632 15.872-0.512 10.24-9.216 18.432-21.504 18.432h-159.232c-11.264 0-20.48-6.656-22.528-15.872-0.512-4.608 1.024-9.216 4.096-13.312l59.904-65.536c-71.68-10.24-119.808-56.832-132.608-121.344-2.56-13.312 2.048-24.064 9.728-26.624 4.608-1.536 9.728 0 13.824 3.584 32.256 27.648 82.432 45.056 139.264 45.056 56.832 0 107.52-17.408 139.776-45.056 4.096-3.584 9.216-5.12 13.312-3.584 7.68 2.56 12.288 13.312 9.728 26.624z" fill="#FFFFFF"/></svg>QQ：{{ company.company_phone || '964539086' }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import axios from 'axios';
import { getCity } from '../city.js';

const city = getCity();
function rc(t) { return city && t ? t.replace(/青岛/g, city.name) : t || ''; }
const services = ref([]);
const cases = ref([]);
const company = ref({});
const templates = ref([]);
const freeEmail = ref('');
const freeSending = ref(false);
const freeDone = ref('');
const freeError = ref('');

async function claimFreeResource() {
  if (!freeEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(freeEmail.value)) {
    freeError.value = '请填写正确的邮箱地址';
    return;
  }
  freeSending.value = true;
  freeError.value = '';
  freeDone.value = '';
  try {
    const { data } = await axios.post('/api/free-resource', { email: freeEmail.value });
    if (data.code === 0) {
      freeDone.value = data.message || '资料已发送，请查收邮箱';
      freeEmail.value = '';
    } else {
      freeError.value = data.message || '提交失败，请稍后再试';
    }
  } catch (e) {
    freeError.value = (e.response && e.response.data && e.response.data.message) || '提交失败，请稍后再试';
  } finally {
    freeSending.value = false;
  }
}

// 滚动进度
const scrollProgress = ref(0);

// 鼠标位置（用于 cursor glow）
const cursor = reactive({ x: 0, y: 0 });

// Canvas 引用
const particleCanvas = ref(null);
let particles = [];
let animationId = null;
let mouseX = 0;
let mouseY = 0;
let canvasWidth = 0;
let canvasHeight = 0;

const steps = [
  { title: '需求沟通', desc: '深度了解业务场景，明确功能边界' },
  { title: '方案设计', desc: '输出 PRD、原型图、技术选型方案' },
  { title: 'UI 设计', desc: '高保真设计稿，3 轮免费修改' },
  { title: '开发实施', desc: '敏捷开发，每周可演示可验收' },
  { title: '测试上线', desc: '多轮测试 + 应用商店上架协助' },
  { title: '运维保障', desc: '1 年免费维护，终身技术支持' }
];

function formatPrice(p) {
  if (!p) return '面议';
  return Number(p).toLocaleString('zh-CN');
}

function formatAmount(v) { return v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'; }

function templatePrice(level) {
  const tpl = templates.value.find(t => t.level === level);
  return tpl ? formatAmount(tpl.price) : '--';
}

function parseStat(s) {
  if (!s) return 0;
  const m = String(s).match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function getGradient(id) {
  const grads = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
    'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'
  ];
  return grads[(id - 1) % grads.length];
}

function getCategoryIcon(cat) {
  return { 'App': '📱', '小程序': '💬', '网站': '🌐', 'SaaS': '⚙️' }[cat] || '🚀';
}

// ============ 1. Canvas 粒子网络 ============
function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvasWidth = canvas.offsetWidth;
  canvasHeight = canvas.offsetHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // 粒子数：根据屏幕宽度自适应
  const particleCount = Math.min(80, Math.floor((canvasWidth * canvasHeight) / 15000));
  particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.5 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(6, 182, 212, 0.5)'
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 更新位置
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // 边界反弹
      if (p.x < 0 || p.x > canvasWidth) p.vx *= -1;
      if (p.y < 0 || p.y > canvasHeight) p.vy *= -1;

      // 鼠标引力
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        p.x += dx * 0.005;
        p.y += dy * 0.005;
      }
    });

    // 绘制粒子
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });

    // 绘制粒子之间的连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - dist / 120) * 0.25})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // 鼠标连线
      const dx = particles[i].x - mouseX;
      const dy = particles[i].y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 180) * 0.4})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    animationId = requestAnimationFrame(animate);
  }
  animate();
}

function handleResize() {
  if (!particleCanvas.value) return;
  canvasWidth = particleCanvas.value.offsetWidth;
  canvasHeight = particleCanvas.value.offsetHeight;
  particleCanvas.value.width = canvasWidth;
  particleCanvas.value.height = canvasHeight;
}

function handleMouseMove(e) {
  if (!particleCanvas.value) return;
  const rect = particleCanvas.value.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  // 更新 cursor-glow
  cursor.x = e.clientX;
  cursor.y = e.clientY;
}

// ============ 2. 数字滚动 ============
function animateCounters() {
  const counters = document.querySelectorAll('.counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const target = parseInt(entry.target.dataset.target) || 0;
        const duration = 1500;
        const start = performance.now();
        const animate = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          entry.target.textContent = Math.floor(target * ease);
          if (progress < 1) requestAnimationFrame(animate);
          else entry.target.textContent = target;
        };
        requestAnimationFrame(animate);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

// ============ 3. 卡片 3D 倾斜 ============
function tiltCard(e, el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = (y - centerY) / 12;
  const rotateY = (centerX - x) / 12;
  el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
}

function resetTilt(el) {
  if (!el) return;
  el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
}

// ============ 4. 滚动进度条 ============
function handleScroll() {
  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  scrollProgress.value = height > 0 ? (winScroll / height) * 100 : 0;
}

// ============ IntersectionObserver (reveal) ============
function goToShop() { window.location.href = '/templates'; }

function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

onMounted(async () => {
  try {
    const [s, c, co, t] = await Promise.all([
      axios.get('/api/services'),
      axios.get('/api/cases', { params: { pageSize: 6 } }),
      axios.get('/api/company'),
      axios.get('/api/templates')
    ]);
    if (s.data.code === 0) services.value = s.data.data;
    if (c.data.code === 0) cases.value = c.data.data.list;
    if (co.data.code === 0) company.value = co.data.data;
    if (t.data.code === 0) templates.value = t.data.data;
  } catch (e) { console.error(e); }

  // 延迟初始化等 DOM 渲染完
  setTimeout(() => {
    initParticles();
    animateCounters();
    initReveal();
  }, 100);

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
/* ========== 滚动进度条 ========== */
.scroll-progress {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  background: linear-gradient(90deg, #1E40AF, #06B6D4, #8B5CF6);
  z-index: 9999;
  transition: width 0.1s ease-out;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

/* ========== Hero ========== */
.hero {
  position: relative;
  min-height: 88vh;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  padding: 100px 0 80px;
  overflow: hidden;
}

/* Canvas 粒子背景 */
.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hero-bg {
  position: absolute; inset: 0;
  pointer-events: none;
  z-index: 2;
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(30, 64, 175, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 64, 175, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 70%);
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: float 8s ease-in-out infinite;
}
.glow-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
  top: -10%; left: -10%;
  animation-delay: 0s;
}
.glow-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  top: 30%; right: -5%;
  animation-delay: 2s;
}
.glow-3 {
  width: 350px; height: 350px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
  bottom: 10%; left: 30%;
  animation-delay: 4s;
}

/* 鼠标位置光圈 */
.cursor-glow {
  position: fixed;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%);
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 0;
  transition: opacity 0.3s;
}

.hero-content {
  position: relative;
  z-index: 3;
  max-width: 820px;
  text-align: center;
  margin: 0 auto;
}
.badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 18px;
  background: var(--bg-glass);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(30, 64, 175, 0.15);
  border-radius: 999px;
  font-size: 13px; font-weight: 500;
  color: var(--primary);
  margin-bottom: 28px;
  box-shadow: var(--shadow-sm);
}
.dot {
  width: 6px; height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: pulse 2s infinite;
}
.hero h1 {
  font-size: 64px; font-weight: 800;
  line-height: 1.1; letter-spacing: -2px;
  margin-bottom: 24px;
}
.hero h1 .line { display: block; }
.hero h1 .gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--accent-2), var(--accent));
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradientShift 6s ease infinite;
}
.hero-slogan {
  font-size: 22px; font-weight: 500;
  color: var(--text-soft);
  margin-bottom: 16px;
}
.hero-desc {
  font-size: 16px; color: var(--text-light);
  line-height: 1.7; margin-bottom: 36px;
  max-width: 640px; margin-left: auto; margin-right: auto;
}
.hero-actions {
  display: flex; gap: 16px; justify-content: center;
  margin-bottom: 64px; flex-wrap: wrap;
}
.arrow {
  transition: transform 0.3s;
  display: inline-block;
}
.btn-primary:hover .arrow { transform: translateX(4px); }

.hero-stats {
  display: flex; justify-content: center; align-items: center;
  gap: 48px; padding-top: 40px;
  border-top: 1px solid var(--border);
  max-width: 700px; margin: 0 auto;
}
.stat { text-align: center; }
.stat strong {
  display: block;
  font-size: 36px; font-weight: 800;
  color: var(--primary);
  line-height: 1;
  margin-bottom: 6px;
  letter-spacing: -1px;
}
.stat span:last-child {
  font-size: 13px;
  color: var(--text-light);
  letter-spacing: 0.5px;
}
.stat-divider {
  width: 1px; height: 36px;
  background: var(--border);
}

/* ========== 服务卡片 3D 倾斜 ========== */
.services-section { background: var(--bg); position: relative; }
.services-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  perspective: 1000px;
}
.service-card {
  background: transparent;
  border-radius: var(--radius-lg);
  transition: transform 0.1s;
}
.card-3d {
  position: relative;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 36px 28px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s;
  transform-style: preserve-3d;
  will-change: transform;
}
.card-3d::before {
  content: '';
  position: absolute; top: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s;
}
.service-card:hover .card-3d::before { transform: scaleX(1); }
.card-3d:hover {
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.service-icon {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(6, 182, 212, 0.1));
  border-radius: var(--radius);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px;
  margin-bottom: 20px;
  transition: transform 0.3s;
}
.card-3d:hover .service-icon { transform: scale(1.1) rotate(-5deg); }
.service-card h3 {
  font-size: 20px; font-weight: 700;
  color: var(--text); margin-bottom: 6px;
}
.service-subtitle {
  font-size: 13px; color: var(--accent);
  margin-bottom: 14px; font-weight: 500;
}
.service-desc {
  font-size: 14px; line-height: 1.7;
  color: var(--text-light);
  margin-bottom: 20px;
  min-height: 72px;
}
.service-features {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 24px;
}
.service-features .tag {
  font-size: 12px; padding: 4px 10px;
  background: var(--bg-soft); color: var(--text-soft);
  border-radius: var(--radius-sm);
  font-weight: 500;
}
.service-price {
  padding-top: 16px;
  border-top: 1px dashed var(--border);
  display: flex; justify-content: space-between; align-items: center;
}
.price-label { font-size: 12px; color: var(--text-mute); }
.price-range { font-size: 15px; font-weight: 700; color: var(--primary); }

/* ========== 流程 ========== */
.process-section {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
}
.process-grid {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px;
}
.process-step {
  position: relative;
  text-align: center;
  padding: 32px 16px;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.3s;
}
.process-step:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-light);
}
.step-num {
  font-size: 32px; font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
  letter-spacing: -1px;
}
.process-step h4 {
  font-size: 15px; font-weight: 600;
  color: var(--text); margin-bottom: 8px;
}
.process-step p {
  font-size: 12px; color: var(--text-light);
  line-height: 1.6;
}
.step-arrow {
  position: absolute;
  right: -20px; top: 50%;
  transform: translateY(-50%);
  color: var(--text-mute);
  font-size: 20px;
  z-index: 1;
}

/* ========== 案例预览 ========== */
.cases-preview { background: var(--bg); }
.cases-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
.case-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  transition: all 0.4s;
}
.case-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}
.case-cover {
  height: 160px; position: relative;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.case-cover::before {
  content: ''; position: absolute; inset: 0;
  background: rgba(255,255,255,0.05);
  background-image:
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.5;
}
.case-cat {
  position: absolute; top: 16px; left: 16px;
  padding: 4px 12px;
  background: rgba(255,255,255,0.95);
  border-radius: var(--radius-sm);
  font-size: 12px; font-weight: 600;
  color: var(--primary-dark);
}
.case-icon {
  font-size: 56px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.2));
  transition: transform 0.4s;
}
.case-card:hover .case-icon { transform: scale(1.15) rotate(-8deg); }
.case-body { padding: 24px; }
.case-body h3 {
  font-size: 17px; font-weight: 600;
  color: var(--text); margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
  overflow: hidden;
}
.case-desc {
  font-size: 13px; color: var(--text-light); line-height: 1.7;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
}
.case-link {
  font-size: 13px; color: var(--primary);
  font-weight: 600;
  transition: gap 0.3s;
}
.case-card:hover .case-link { color: var(--accent); }
.text-center { text-align: center; }

/* ========== 模板商城 ========== */
.shop-section { background: rgba(255,255,255,0.88); backdrop-filter: blur(12px); }
.shop-cards { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; }
.shop-level {
  background: white; border: 2px solid #E2E8F0; border-radius: 16px;
  padding: 36px 28px; width: 260px; cursor: pointer; text-align: center;
  transition: all 0.3s;
}
.shop-level:hover {
  border-color: #3B82F6; transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(59,130,246,0.12);
}
.shop-level.pro { border-color: #DDD6FE; }
.shop-level.pro:hover { border-color: #7C3AED; box-shadow: 0 8px 24px rgba(124,58,237,0.12); }
.shop-level.enterprise { border-color: #FDE68A; }
.shop-level.enterprise:hover { border-color: #D97706; box-shadow: 0 8px 24px rgba(217,119,6,0.12); }
.shop-icon { font-size: 42px; display: block; margin-bottom: 12px; }
.shop-level h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.shop-price {
  display: block; font-size: 28px; font-weight: 800; color: #DC2626;
  margin-bottom: 8px;
}
.shop-level p { font-size: 14px; color: #64748B; margin-bottom: 20px; }
.shop-btn {
  display: inline-block; padding: 8px 24px; border-radius: 999px;
  background: #3B82F6; color: white; font-size: 14px; font-weight: 600;
  transition: all 0.2s;
}
.shop-level:hover .shop-btn { background: #2563EB; }

/* ========== CTA ========== */
/* ========== 免费资料 ========== */
.free-section { background: #F8FAFC; position: relative; }
.free-card {
  display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; align-items: center;
  background: white; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 48px 56px; box-shadow: 0 10px 30px rgba(15,23,42,0.06);
}
.free-left h2 { font-size: 28px; line-height: 1.35; margin: 12px 0 14px; }
.free-left p { color: #64748B; font-size: 15px; line-height: 1.8; }
.free-form { display: flex; gap: 12px; flex-wrap: wrap; }
.free-form input {
  flex: 1; min-width: 240px; padding: 12px 16px; border: 1.5px solid #CBD5E1;
  border-radius: 10px; font-size: 15px; outline: none; transition: border-color 0.2s;
}
.free-form input:focus { border-color: #3B82F6; }
.free-msg { margin-top: 14px; font-size: 14px; }
.free-msg.success { color: #059669; }
.free-msg.error { color: #DC2626; }
@media (max-width: 768px) {
  .free-card { grid-template-columns: 1fr; padding: 32px 24px; }
  .free-left h2 { font-size: 24px; }
}
.cta-section {
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 50%, var(--accent-2) 100%);
  background-size: 200% 200%;
  animation: gradientShift 10s ease infinite;
  color: white; padding: 80px 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.cta-section::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 32px 32px;
}
.cta-content { position: relative; }
.cta-section h2 {
  font-size: 36px; font-weight: 700;
  margin-bottom: 16px; letter-spacing: -1px;
}
.cta-section p {
  font-size: 17px; opacity: 0.9;
  margin-bottom: 32px;
}
.cta-actions {
  display: flex; gap: 16px; justify-content: center;
  flex-wrap: wrap;
}
.cta-section .btn-ghost-light {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.cta-section .btn-ghost-light:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .hero h1 { font-size: 48px; }
  .services-grid, .cases-grid { grid-template-columns: repeat(2, 1fr); }
  .process-grid { grid-template-columns: repeat(3, 1fr); }
  .process-step:nth-child(3) .step-arrow { display: none; }
  .hero-stats { gap: 24px; flex-wrap: wrap; }
}
@media (max-width: 768px) {
  .hero { min-height: auto; padding: 60px 0 48px; }
  .hero h1 { font-size: 36px; }
  .services-grid, .cases-grid { grid-template-columns: 1fr; }
  .process-grid { grid-template-columns: 1fr 1fr; }
  .step-arrow { display: none; }
  .hero-stats { gap: 16px; }
  .stat-divider { display: none; }
  .stat strong { font-size: 24px; }
  .cursor-glow { display: none; }
}
</style>

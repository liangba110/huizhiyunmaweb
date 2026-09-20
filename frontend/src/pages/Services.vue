<template>
  <div class="services-page">
    <ParticleBanner density="low">
      <h1 class="reveal visible">服务介绍</h1>
      <p class="reveal visible">专业的技术能力，标准的服务流程</p>
    </ParticleBanner>

    <section class="section">
      <div class="container">
        <div v-for="(s, idx) in services" :key="s.id" class="service-block reveal" :style="`transition-delay: ${idx * 100}ms`">
          <div class="service-block-icon">{{ s.icon }}</div>
          <div class="service-block-content">
            <span class="service-tag">{{ s.subtitle }}</span>
            <h2>{{ s.title }}</h2>
            <p class="description">{{ s.description }}</p>
            <div class="features-grid">
              <div v-for="f in (s.features||'').split('|').filter(Boolean)" :key="f" class="feature-item">
                <span class="check">✓</span>{{ f }}
              </div>
            </div>
            <div class="price-box">
              <span>参考报价</span>
              <strong>¥{{ formatPrice(s.price_min) }} - {{ formatPrice(s.price_max) }}</strong>
              <router-link to="/contact" class="btn btn-primary">咨询定制方案</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import ParticleBanner from '../components/ParticleBanner.vue';
const services = ref([]);

function formatPrice(p) {
  if (!p) return '面议';
  return Number(p).toLocaleString('zh-CN');
}

onMounted(async () => {
  const { data } = await axios.get('/api/services');
  if (data.code === 0) services.value = data.data;
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
.services-page {
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

.service-block {
  display: flex; gap: 56px; padding: 56px 0;
  border-bottom: 1px solid var(--border);
}
.service-block:last-child { border-bottom: none; }
.service-block-icon {
  width: 120px; height: 120px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: var(--radius-xl);
  display: flex; align-items: center; justify-content: center;
  font-size: 60px;
  box-shadow: var(--shadow-glow);
  position: relative;
}
.service-block-icon::after {
  content: ''; position: absolute; inset: -4px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--primary), var(--accent));
  opacity: 0.2; filter: blur(16px);
  z-index: -1;
}
.service-block-content { flex: 1; }
.service-tag {
  display: inline-block;
  font-size: 13px; font-weight: 500;
  padding: 4px 12px;
  background: rgba(30, 64, 175, 0.08);
  color: var(--primary);
  border-radius: 999px;
  margin-bottom: 12px;
}
.service-block-content h2 {
  font-size: 32px; font-weight: 700;
  color: var(--text); margin-bottom: 16px;
  letter-spacing: -1px;
}
.description {
  font-size: 16px; line-height: 1.8;
  color: var(--text-soft);
  margin-bottom: 28px;
}
.features-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin-bottom: 32px;
}
.feature-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  background: var(--bg-soft);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text-soft);
  transition: all 0.3s;
}
.feature-item:hover {
  background: rgba(30, 64, 175, 0.08);
  transform: translateX(4px);
}
.check {
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.price-box {
  display: flex; align-items: center; gap: 20px;
  padding: 20px 28px;
  background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
  border-radius: var(--radius);
  border-left: 3px solid var(--primary);
}
.price-box > span {
  font-size: 13px; color: var(--text-light);
}
.price-box strong {
  font-size: 20px;
  color: var(--primary-dark);
  font-weight: 700;
  flex: 1;
}

@media (max-width: 768px) {
  .service-block { flex-direction: column; gap: 24px; padding: 40px 0; }
  .service-block-icon { width: 80px; height: 80px; font-size: 40px; border-radius: var(--radius-lg); }
  .features-grid { grid-template-columns: 1fr; }
  .price-box { flex-direction: column; align-items: flex-start; gap: 12px; }
  .price-box strong { flex: none; }
}
</style>
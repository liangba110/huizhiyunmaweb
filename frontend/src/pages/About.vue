<template>
  <div class="about-page">
    <ParticleBanner density="low">
      <h1 class="reveal visible">关于我们</h1>
      <p class="reveal visible">专业、可靠、长期主义的合作伙伴</p>
    </ParticleBanner>

    <section class="section">
      <div class="container">
        <div class="about-grid">
          <div class="about-block reveal">
            <span class="block-tag">COMPANY</span>
            <h2>公司简介</h2>
            <p>{{ company.company_intro }}</p>
          </div>

          <div class="about-block reveal">
            <span class="block-tag">ADVANTAGES</span>
            <h2>核心优势</h2>
            <div class="advantages">
              <div v-for="(adv, idx) in advantages" :key="idx" class="adv">
                <div class="adv-icon">{{ adv.icon }}</div>
                <h4>{{ adv.title }}</h4>
                <p>{{ adv.desc }}</p>
              </div>
            </div>
          </div>

          <div class="about-block reveal">
            <span class="block-tag">WORKFLOW</span>
            <h2>合作流程</h2>
            <ol class="timeline">
              <li v-for="(step, idx) in workflow" :key="idx">
                <strong>{{ step.title }}</strong> — {{ step.desc }}
              </li>
            </ol>
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
const company = ref({});
const advantages = [
  { icon: '🎯', title: '需求导向', desc: '深入理解业务场景，拒绝套模板' },
  { icon: '⚡', title: '敏捷开发', desc: '每周可演示可验收，进度透明' },
  { icon: '💰', title: '透明报价', desc: '无隐藏费用，分阶段付款' },
  { icon: '🛡️', title: '源码交付', desc: '完整源码归属客户，无任何锁定' },
  { icon: '🔧', title: '1年免费维护', desc: '交付后 1 年内免费 bug 修复' },
  { icon: '📞', title: '终身技术支持', desc: '超过 1 年仍提供付费技术支持' }
];
const workflow = [
  { title: '商务洽谈', desc: '电话/微信沟通需求' },
  { title: '签订合同', desc: '明确功能、周期、费用' },
  { title: '方案设计', desc: '输出 PRD + 原型图' },
  { title: 'UI 设计', desc: '高保真设计稿' },
  { title: '开发实施', desc: '敏捷开发，每周演示' },
  { title: '测试验收', desc: '多轮测试 + UAT' },
  { title: '上线发布', desc: '应用商店上架协助' },
  { title: '运维支持', desc: '1 年免费维护' }
];

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
.about-page {
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

.about-block { margin-bottom: 80px; }
.about-block:last-child { margin-bottom: 0; }
.block-tag {
  display: inline-block;
  font-size: 12px; font-weight: 600;
  letter-spacing: 1.5px;
  color: var(--primary);
  padding: 4px 12px;
  background: rgba(30, 64, 175, 0.08);
  border-radius: 999px;
  margin-bottom: 16px;
}
.about-block h2 {
  font-size: 32px; font-weight: 700;
  color: var(--text);
  margin-bottom: 24px;
  letter-spacing: -1px;
}
.about-block > p {
  font-size: 16px; line-height: 1.9;
  color: var(--text-soft);
  max-width: 800px;
}

.advantages {
  display: grid;
  grid-template-columns: repeat(3, 1fr); gap: 20px;
}
.adv {
  padding: 28px 24px;
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.4s;
}
.adv:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.adv-icon {
  font-size: 36px;
  margin-bottom: 16px;
  display: inline-block;
  transition: transform 0.3s;
}
.adv:hover .adv-icon { transform: scale(1.2) rotate(-10deg); }
.adv h4 {
  font-size: 17px; font-weight: 600;
  margin-bottom: 8px; color: var(--text);
}
.adv p {
  font-size: 13px; color: var(--text-light);
  line-height: 1.6;
}

.timeline {
  counter-reset: step;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.timeline li {
  padding: 16px 20px;
  background: var(--bg-soft);
  border-radius: var(--radius);
  font-size: 14px;
  border-left: 3px solid var(--primary);
  transition: all 0.3s;
}
.timeline li:hover {
  background: white;
  border-left-color: var(--accent);
  transform: translateX(4px);
  box-shadow: var(--shadow);
}
.timeline strong { color: var(--primary); margin-right: 8px; }

@media (max-width: 768px) {
  .advantages { grid-template-columns: 1fr; }
  .timeline { grid-template-columns: 1fr; }
}
</style>
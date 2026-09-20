<template>
  <div class="cases-page">
    <ParticleBanner density="low">
      <h1 class="reveal visible">案例展示</h1>
      <p class="reveal visible">{{ total }}+ 真实项目案例，见证我们的专业实力</p>
    </ParticleBanner>

    <section class="section">
      <div class="container">
        <div class="filter-tabs reveal">
          <button :class="['tab', { active: !filter }]" @click="setFilter('')">全部 ({{ caseList.length }})</button>
          <button v-for="c in categories" :key="c" :class="['tab', { active: filter === c }]" @click="setFilter(c)">
            {{ getCategoryIcon(c) }} {{ c }}
          </button>
        </div>
        <div v-if="loading" class="loading">加载中…</div>
        <div v-else class="cases-grid">
          <router-link v-for="(c, idx) in caseList" :key="c.id" :to="`/cases/${c.id}`" class="case-card reveal" :style="`transition-delay: ${idx * 60}ms`">
            <div class="case-cover" :style="{ background: getGradient(c.id) }">
              <span class="case-cat">{{ c.category }}</span>
              <span class="case-icon">{{ getCategoryIcon(c.category) }}</span>
            </div>
            <div class="case-body">
              <h3>{{ rc(c.title) }}</h3>
              <p class="case-client">客户：{{ c.client || '—' }}</p>
              <p class="case-desc">{{ rc(c.description) }}</p>
              <div class="case-tech" v-if="c.technologies">
                <span v-for="t in c.technologies.split('+').map(x=>x.trim()).slice(0,3)" :key="t" class="tech-tag">{{ t }}</span>
              </div>
              <div class="case-footer">
                <span>👁 {{ c.view_count || 0 }}</span>
                <span class="case-link">查看详情 →</span>
              </div>
            </div>
          </router-link>
        </div>
        <div v-if="!loading && caseList.length === 0" class="empty">暂无案例</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { getCity } from '../city.js';
import ParticleBanner from '../components/ParticleBanner.vue';
const city = getCity();
function rc(t) { return city && t ? t.replace(/青岛/g, city.name) : t || ''; }
const caseList = ref([]);
const categories = ref([]);
const filter = ref('');
const loading = ref(true);
const total = ref(0);

function setFilter(v) { filter.value = v; load(); }
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

async function load() {
  loading.value = true;
  const { data } = await axios.get('/api/cases', { params: { category: filter.value || undefined, pageSize: 50 } });
  if (data.code === 0) {
    caseList.value = data.data.list;
    categories.value = [...new Set(data.data.list.map(x => x.category).filter(Boolean))];
    total.value = data.data.total || caseList.value.length;
  }
  loading.value = false;
  setTimeout(initReveal, 100);
}

onMounted(load);

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
.cases-page {
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

.filter-tabs {
  display: flex; gap: 12px;
  margin-bottom: 40px; flex-wrap: wrap;
}
.tab {
  padding: 10px 22px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer; font-size: 14px; font-weight: 500;
  color: var(--text-soft);
  transition: all 0.3s;
}
.tab:hover {
  border-color: var(--primary-light);
  color: var(--primary);
}
.tab.active {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white; border-color: transparent;
  box-shadow: var(--shadow-glow);
}

.cases-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}
.case-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex; flex-direction: column;
}
.case-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.case-cover {
  height: 180px; position: relative;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.case-cover::before {
  content: ''; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}
.case-cat {
  position: absolute; top: 16px; left: 16px;
  padding: 4px 12px;
  background: rgba(255,255,255,0.95);
  border-radius: var(--radius-sm);
  font-size: 12px; font-weight: 600;
  color: var(--primary-dark);
  z-index: 2;
}
.case-icon {
  font-size: 64px;
  filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));
  transition: transform 0.4s;
}
.case-card:hover .case-icon { transform: scale(1.15) rotate(-10deg); }
.case-body { padding: 24px; flex: 1; display: flex; flex-direction: column; }
.case-body h3 {
  font-size: 17px; font-weight: 600;
  color: var(--text); margin-bottom: 8px;
  line-height: 1.4;
}
.case-client {
  font-size: 12px; color: var(--text-mute);
  margin-bottom: 12px;
}
.case-desc {
  font-size: 13px; color: var(--text-light); line-height: 1.7;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16px;
  flex: 1;
}
.case-tech {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-bottom: 16px;
}
.tech-tag {
  font-size: 11px; padding: 3px 8px;
  background: rgba(30, 64, 175, 0.08);
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-weight: 500;
}
.case-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 13px; color: var(--text-light);
}
.case-link {
  color: var(--primary);
  font-weight: 600;
}
.case-card:hover .case-link { color: var(--accent); }
.loading, .empty { text-align: center; padding: 80px 0; color: var(--text-light); }

@media (max-width: 1024px) { .cases-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .cases-grid { grid-template-columns: 1fr; } }
</style>

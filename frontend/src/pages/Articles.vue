<template>
  <div class="articles-page">
    <ParticleBanner density="low">
      <h1 class="reveal visible">资讯博客</h1>
      <p class="reveal visible">行业洞察、技术分享、踩坑笔记</p>
    </ParticleBanner>
    <section class="section">
      <div class="container">
        <div v-if="loading" class="loading">加载中…</div>
        <div v-else-if="list.length === 0" class="empty">
          <p>暂无文章，敬请期待</p>
        </div>
        <div v-else>
          <div class="category-bar reveal visible">
            <button
              v-for="c in catOptions"
              :key="c.category"
              class="cat-btn"
              :class="{ active: (currentCat || '全部') === c.category }"
              @click="switchCategory(c.category)"
            >
              {{ c.category }}<span class="cat-count">{{ c.count }}</span>
            </button>
          </div>
          <div class="articles-grid">
            <router-link v-for="(a, idx) in list" :key="a.id" :to="`/articles/${a.id}`" class="article-card reveal" :style="`transition-delay: ${idx * 60}ms`">
              <div class="article-meta">
                <span class="cat">{{ a.category || '资讯' }}</span>
                <span v-if="a.is_top" class="top">置顶</span>
                <span class="date">{{ formatDate(a.published_at || a.created_at) }}</span>
              </div>
              <h3>{{ rc(a.title) }}</h3>
              <p class="summary">{{ rc(a.summary) }}</p>
              <div class="article-footer">
                <span>👁 {{ a.view_count || 0 }}</span>
                <span>✍️ {{ a.author }}</span>
                <span class="read-more">阅读全文 →</span>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { getCity } from '../city.js';
import ParticleBanner from '../components/ParticleBanner.vue';
const city = getCity();
function rc(t) { return city && t ? t.replace(/青岛/g, city.name) : t || ''; }
const list = ref([]);
const loading = ref(true);
const cats = ref([]);
const currentCat = ref('');
const catOptions = computed(() => [{ category: '全部', count: totalCount.value }, ...cats.value]);
const totalCount = computed(() => cats.value.reduce((s, c) => s + c.count, 0));

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('zh-CN');
}

async function loadArticles() {
  loading.value = true;
  const { data } = await axios.get('/api/articles', {
    params: { pageSize: 50, ...(currentCat.value ? { category: currentCat.value } : {}) }
  });
  if (data.code === 0) list.value = data.data.list;
  loading.value = false;
  setTimeout(initReveal, 100);
}

function switchCategory(cat) {
  if (currentCat.value === cat) return;
  currentCat.value = cat === '全部' ? '' : cat;
  loadArticles();
}

onMounted(async () => {
  const [artRes, catRes] = await Promise.all([
    axios.get('/api/articles', { params: { pageSize: 50 } }),
    axios.get('/api/articles/categories')
  ]);
  if (artRes.data.code === 0) list.value = artRes.data.data.list;
  if (catRes.data.code === 0) cats.value = catRes.data.data;
  loading.value = false;
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
.articles-page {
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

.articles-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;
}
.article-card {
  background: white;
  padding: 32px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.4s;
  display: flex; flex-direction: column;
}
.article-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}
.article-meta {
  display: flex; gap: 12px; align-items: center;
  margin-bottom: 16px; font-size: 12px;
}
.cat {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(6, 182, 212, 0.1));
  color: var(--primary);
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.top {
  padding: 4px 10px;
  background: linear-gradient(135deg, #F59E0B, #EF4444);
  color: white;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 11px;
}
.date { color: var(--text-light); margin-left: auto; }
.article-card h3 {
  font-size: 20px; font-weight: 600;
  color: var(--text); margin-bottom: 12px;
  line-height: 1.4;
}
.summary {
  font-size: 14px; color: var(--text-light);
  line-height: 1.7;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 20px;
  flex: 1;
}
.article-footer {
  display: flex; gap: 16px; align-items: center;
  font-size: 13px; color: var(--text-light);
  padding-top: 16px;
  border-top: 1px dashed var(--border);
}
.read-more {
  margin-left: auto;
  color: var(--primary);
  font-weight: 600;
}
.article-card:hover .read-more { color: var(--accent); }
.loading, .empty { text-align: center; padding: 80px 0; color: var(--text-light); }

.category-bar {
  display: flex; flex-wrap: wrap; gap: 12px;
  margin-bottom: 28px; padding: 16px;
  background: white;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.cat-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #f8fafc;
  color: var(--text);
  font-size: 14px; font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}
.cat-btn:hover { border-color: var(--primary); color: var(--primary); }
.cat-btn.active {
  background: linear-gradient(135deg, #1e40af, #06b6d4);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(30, 64, 175, 0.25);
}
.cat-count {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.06);
}
.cat-btn.active .cat-count { background: rgba(255,255,255,0.25); }

@media (max-width: 768px) { .articles-grid { grid-template-columns: 1fr; } }
</style>

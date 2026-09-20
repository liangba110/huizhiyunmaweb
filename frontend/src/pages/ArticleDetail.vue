<template>
  <div class="article-detail">
    <section v-if="data" class="section">
      <div class="container">
        <div class="detail-meta">
          <span class="cat">{{ data.category || '资讯' }}</span>
          <span>{{ formatDate(data.published_at || data.created_at) }}</span>
          <span>👁 {{ data.view_count }} 次</span>
          <span>✍️ {{ data.author }}</span>
        </div>
        <h1>{{ title }}</h1>
        <p class="summary">{{ summary }}</p>
        <article class="content" v-html="content || '内容正在编写中...'"></article>

        <!-- 相关文章推荐（SEO内链） -->
        <div v-if="related.length" class="related-section">
          <h2 class="related-title">📖 相关推荐</h2>
          <div class="related-grid">
            <router-link v-for="r in related" :key="r.id" :to="`/articles/${r.id}`" class="related-card">
              <span class="related-cat">{{ r.category || '资讯' }}</span>
              <h3>{{ rc(r.title) }}</h3>
              <p>{{ rc(r.summary) }}</p>
            </router-link>
          </div>
        </div>

        <!-- 服务引导内链（SEO权重传递） -->
        <div class="seo-cta">
          <p>💡 <strong>汇智云码科技</strong>专注企业数字化转型，提供 <router-link to="/services">APP开发</router-link>、<router-link to="/services">小程序定制</router-link>、<router-link to="/services">网站建设</router-link> 等一站式服务。<router-link to="/cases">查看真实案例 →</router-link></p>
        </div>

        <div class="back-cta">
          <router-link to="/articles" class="btn btn-outline">← 返回列表</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios'
import { getCity } from '../city.js';

const route = useRoute();
const data = ref(null);
const city = getCity();
function rc(t) { return city && t ? t.replace(/\u9752\u5c9b/g, city.name) : t || ''; }
const title = computed(() => rc(data.value && data.value.title));
const summary = computed(() => rc(data.value && data.value.summary));
const content = computed(() => rc(data.value && data.value.content));
const related = ref([]);

async function loadRelated(currentId, category) {
  try {
    const { data: d } = await axios.get('/api/articles', { params: { pageSize: 50 } });
    if (d.code === 0) {
      // 优先同分类，排除当前文章，取3篇
      const sameCat = d.data.list.filter(a => a.id !== currentId && a.category === category);
      const diffCat = d.data.list.filter(a => a.id !== currentId && a.category !== category);
      related.value = [...sameCat, ...diffCat].slice(0, 3);
    }
  } catch (e) { /* 静默失败 */ }
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('zh-CN');
}

function setMeta(name, val, attr) {
  attr = attr || "name";
  let el = document.querySelector('meta[' + attr + '="' + name + '"]');
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute("content", val);
}

onMounted(async () => {
  const { data: d } = await axios.get(`/api/articles/${route.params.id}`);
  if (d.code === 0) {
    data.value = d.data;
    if (d.data) {
      var _cn = getCity(); var _t = d.data.title; if (_cn) { _t = _t.replace(/\u9752\u5c9b/g, _cn.name); } document.title = _t + ' | ' + (_cn ? _cn.name + '汇智云码科技' : '汇智云码科技');
      var _s = d.data.summary || d.data.title; if (_cn) { _s = _s.replace(/\u9752\u5c9b/g, _cn.name); } setMeta('description', _s);
      setMeta('keywords', (d.data.category || '技术文章') + ',' + d.data.title);
      setMeta('og:title', _t + ' | ' + (_cn ? _cn.name + '汇智云码科技' : '汇智云码科技'), 'property');
      setMeta('og:description', _s, 'property');
      loadRelated(d.data.id, d.data.category);
    }
  }
});
</script>

<style scoped>
.article-detail {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  min-height: 100vh;
}
.detail-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-light); margin-bottom: 16px; flex-wrap: wrap; }
.cat { padding: 3px 10px; background: rgba(30, 64, 175, 0.1); color: var(--primary); border-radius: 4px; font-weight: 600; }
h1 { font-size: 36px; font-weight: 700; margin-bottom: 16px; line-height: 1.4; color: var(--text); }
.summary {
  font-size: 16px; color: var(--text-light); line-height: 1.8;
  padding: 16px 20px; background: var(--bg-soft); border-left: 4px solid var(--primary);
  margin-bottom: 32px; border-radius: 4px;
}
.content {
  font-size: 16px; line-height: 1.9; color: var(--text);
}
.content :deep(h2) { font-size: 24px; font-weight: 600; margin: 32px 0 16px; color: var(--primary-dark); }
.content :deep(h3) { font-size: 20px; font-weight: 600; margin: 24px 0 12px; }
.content :deep(p) { margin-bottom: 16px; }
.content :deep(code) { background: var(--bg-soft); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; font-size: 14px; color: var(--primary-dark); }
.content :deep(pre) { background: #1F2937; color: #F9FAFB; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
.content :deep(pre) code { background: transparent; color: inherit; padding: 0; }
.content :deep(ul), .content :deep(ol) { padding-left: 24px; margin-bottom: 16px; }
.content :deep(blockquote) { border-left: 4px solid var(--accent); padding: 12px 16px; background: rgba(245, 158, 11, 0.05); margin: 16px 0; color: var(--text-light); }
.back-cta { margin-top: 48px; text-align: center; }
.btn-outline { background: transparent; color: var(--primary); border: 2px solid var(--primary); }
.btn-outline:hover { background: var(--primary); color: white; }

/* 相关推荐 */
.related-section { margin-top: 48px; padding-top: 32px; border-top: 2px solid var(--border); }
.related-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: var(--text); }
.related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.related-card {
  background: white; border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 20px; transition: all 0.3s; display: block; text-decoration: none;
}
.related-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); border-color: var(--primary); }
.related-cat {
  display: inline-block; padding: 2px 10px; font-size: 12px; font-weight: 600;
  background: rgba(30,64,175,0.08); color: var(--primary); border-radius: 4px; margin-bottom: 10px;
}
.related-card h3 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 8px; line-height: 1.4; }
.related-card p { font-size: 13px; color: var(--text-light); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 服务引导 */
.seo-cta {
  margin-top: 32px; padding: 20px 24px;
  background: linear-gradient(135deg, rgba(30,64,175,0.04), rgba(6,182,212,0.04));
  border: 1px solid rgba(30,64,175,0.12); border-radius: var(--radius-lg);
  font-size: 15px; color: var(--text); line-height: 1.8;
}
.seo-cta a { color: var(--primary); font-weight: 600; text-decoration: none; }
.seo-cta a:hover { text-decoration: underline; }

@media (max-width: 768px) { .related-grid { grid-template-columns: 1fr; } }
</style>
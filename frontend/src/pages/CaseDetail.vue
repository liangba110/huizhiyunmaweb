<template>
  <div class="case-detail">
    <section v-if="data" class="section">
      <div class="container">
        <div class="detail-cover" :style="{ background: getGradient(data.id) }">
          <span class="case-cat">{{ data.category }}</span>
          <h1>{{ data.title }}</h1>
        </div>
        <div class="detail-meta">
          <span>👤 客户：{{ data.client || '—' }}</span>
          <span>🛠 技术：{{ data.technologies || '—' }}</span>
          <span>👁 浏览：{{ data.view_count }} 次</span>
        </div>
        <article class="detail-content">
          <p>{{ data.description }}</p>
          <div v-if="data.content" v-html="data.content"></div>
          <div v-else class="placeholder">
            <h3>项目概述</h3>
            <p>{{ data.description }}</p>
            <h3>技术栈</h3>
            <p>{{ data.technologies }}</p>
            <h3>项目成果</h3>
            <p>该项目已成功交付并稳定运行，获得了客户的高度认可。如需了解详细方案，请联系我们的咨询顾问。</p>
          </div>
        </article>
        <div class="back-cta">
          <router-link to="/cases" class="btn btn-outline">← 返回案例列表</router-link>
          <router-link to="/contact" class="btn btn-primary">咨询类似项目 →</router-link>
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
const desc = computed(() => rc(data.value && data.value.description));
function getGradient(id) {
  const grads = ['linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)','linear-gradient(135deg, #fa709a 0%, #fee140 100%)','linear-gradient(135deg, #30cfd0 0%, #330867 100%)','linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'];
  return grads[(id - 1) % grads.length];
}
function setMeta(name, val, attr) {
  attr = attr || 'name';
  let el = document.querySelector('meta[' + attr + '="' + name + '"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', val);
}

onMounted(async () => {
  const { data: d } = await axios.get(`/api/cases/${route.params.id}`);
  if (d.code === 0) {
    data.value = d.data;
    if (d.data) {
      var _cn = getCity(); var _t = d.data.title; if (_cn) { _t = _t.replace(/\u9752\u5c9b/g, _cn.name); } document.title = _t + ' | ' + (_cn ? _cn.name + '汇智云码科技' : '汇智云码科技');
      setMeta('description', d.data.description || d.data.title);
      setMeta('keywords', (d.data.category || '开发案例') + ',' + d.data.title);
      setMeta('og:title', d.data.title + ' | 汇智云码科技', 'property');
      setMeta('og:description', d.data.description || d.data.title, 'property');
    }
  }
});
</script>

<style scoped>
.section { background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); border-radius: 20px; padding: 40px; margin: 40px auto; max-width: 900px; }
@media (max-width: 768px) { .section { padding: 20px; margin: 20px 12px; } }
.detail-cover {
  border-radius: 16px; padding: 60px 40px; color: white;
  display: flex; flex-direction: column; justify-content: flex-end;
  min-height: 280px; margin-bottom: 24px;
}
.detail-cover h1 { font-size: 36px; margin-top: 12px; }
.case-cat {
  align-self: flex-start;
  padding: 4px 12px; background: rgba(255,255,255,0.9);
  border-radius: 4px; font-size: 12px; font-weight: 600; color: var(--primary-dark);
}
.detail-meta {
  display: flex; gap: 24px; padding: 16px 0;
  border-bottom: 1px solid var(--border); font-size: 14px; color: #334155;
  margin-bottom: 32px; flex-wrap: wrap;
}
.detail-content {
  font-size: 16px; line-height: 1.9; color: #1E293B;
}
.detail-content p { margin-bottom: 16px; }
.placeholder h3 {
  font-size: 20px; color: var(--primary-dark);
  margin: 24px 0 12px; font-weight: 600;
}
.back-cta {
  display: flex; gap: 16px; margin-top: 48px; justify-content: center;
}
.back-cta .btn-outline {
  background: transparent; color: var(--primary);
  border: 2px solid var(--primary);
}
.back-cta .btn-outline:hover { background: var(--primary); color: white; }
</style>
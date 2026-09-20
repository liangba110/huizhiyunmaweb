<template>
  <div id="layout">
    <!-- 管理后台全屏显示，不套header/footer -->
    <template v-if="$route.path === '/admin'">
      <router-view />
    </template>
    <template v-else>
      <header class="site-header">
        <div class="container header-inner">
          <router-link to="/" class="logo">
            <span class="logo-icon">汇</span>
            <span class="logo-text">
              <strong>汇智云码</strong>
              <em>HuiZhiYunMa Tech</em>
            </span>
          </router-link>
          <nav class="nav">
            <router-link to="/" exact-active-class="active">首页</router-link>
            <router-link to="/services" active-class="active">服务介绍</router-link>
            <router-link to="/cases" active-class="active">案例展示</router-link>
            <router-link to="/articles" active-class="active">资讯博客</router-link>
            <router-link to="/about" active-class="active">关于我们</router-link>
            <router-link to="/contact" active-class="active">联系咨询</router-link>
            <a :href="cityName ? &quot;https://openai2000.cn/packages&quot; : &quot;/packages&quot;" :class="{ active: route.path === &quot;/packages&quot; }">服务套餐</a>
            <a :href="cityName ? &quot;https://openai2000.cn/templates&quot; : &quot;/templates&quot;" :class="{ active: route.path === &quot;/templates&quot; }">模板商城</a>
            <div class="city-dropdown">
              <span class="city-trigger">城市服务 ▾</span>
              <div class="city-menu">
                <a href="https://qingdao.openai2000.cn/">青岛</a>
                <a href="https://beijing.openai2000.cn/">北京</a>
                <a href="https://shanghai.openai2000.cn/">上海</a>
                <a href="https://guangzhou.openai2000.cn/">广州</a>
                <a href="https://shenzhen.openai2000.cn/">深圳</a>
                <a href="https://chengdu.openai2000.cn/">成都</a>
                <a href="https://hangzhou.openai2000.cn/">杭州</a>
                <a href="https://nanjing.openai2000.cn/">南京</a>
                <a href="https://wuhan.openai2000.cn/">武汉</a>
                <a href="https://jinan.openai2000.cn/">济南</a>
                <a href="https://xian.openai2000.cn/">西安</a>
                <a href="https://changsha.openai2000.cn/">长沙</a>
                <a href="https://kunming.openai2000.cn/">昆明</a>
                <a href="https://zhengzhou.openai2000.cn/">郑州</a>
                <a href="https://fuzhou.openai2000.cn/">福州</a>
                <a href="https://xiamen.openai2000.cn/">厦门</a>
                <a href="https://dalian.openai2000.cn/">大连</a>
                <a href="https://qingdao.openai2000.cn/city" class="city-all">查看全部城市 →</a>
              </div>
            </div>
          </nav>
          <button class="nav-toggle" :class="{ open: menuOpen }" type="button" aria-label="打开导航菜单" @click="menuOpen = !menuOpen">
            <span></span><span></span><span></span>
          </button>
        </div>
        <nav class="mobile-nav" :class="{ open: menuOpen }">
          <router-link to="/" @click="menuOpen = false">首页</router-link>
          <router-link to="/services" @click="menuOpen = false">服务介绍</router-link>
          <router-link to="/cases" @click="menuOpen = false">案例展示</router-link>
          <router-link to="/articles" @click="menuOpen = false">资讯博客</router-link>
          <router-link to="/about" @click="menuOpen = false">关于我们</router-link>
          <router-link to="/contact" @click="menuOpen = false">联系咨询</router-link>
          <a :href="cityName ? &quot;https://openai2000.cn/packages&quot; : &quot;/packages&quot;" @click="menuOpen = false">服务套餐</a>
          <a :href="cityName ? &quot;https://openai2000.cn/templates&quot; : &quot;/templates&quot;" @click="menuOpen = false">模板商城</a>
          <div class="mobile-city">
            <p>城市服务</p>
            <div class="mobile-city-grid">
              <a href="https://qingdao.openai2000.cn/">青岛</a>
              <a href="https://beijing.openai2000.cn/">北京</a>
              <a href="https://shanghai.openai2000.cn/">上海</a>
              <a href="https://guangzhou.openai2000.cn/">广州</a>
              <a href="https://shenzhen.openai2000.cn/">深圳</a>
              <a href="https://chengdu.openai2000.cn/">成都</a>
              <a href="https://hangzhou.openai2000.cn/">杭州</a>
              <a href="https://nanjing.openai2000.cn/">南京</a>
              <a href="https://wuhan.openai2000.cn/">武汉</a>
              <a href="https://jinan.openai2000.cn/">济南</a>
              <a href="https://xian.openai2000.cn/">西安</a>
              <a href="https://changsha.openai2000.cn/">长沙</a>
              <a href="https://kunming.openai2000.cn/">昆明</a>
              <a href="https://zhengzhou.openai2000.cn/">郑州</a>
              <a href="https://fuzhou.openai2000.cn/">福州</a>
              <a href="https://xiamen.openai2000.cn/">厦门</a>
              <a href="https://dalian.openai2000.cn/">大连</a>
            </div>
            <a href="https://qingdao.openai2000.cn/city" class="mobile-city-all">查看全部城市 →</a>
          </div>
        </nav>
      </header>

      <main>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <h4>汇智云码科技</h4>
            <p>{{ company.company_slogan || '让企业拥有属于自己的 App 与小程序' }}</p>
            <p style="opacity: 0.7; font-size: 13px; line-height: 1.7;">{{ company.company_intro }}</p>
          </div>
          <div class="footer-col">
            <h4>核心服务</h4>
            <ul>
              <li><router-link to="/services">App 定制开发</router-link></li>
              <li><router-link to="/services">小程序定制开发</router-link></li>
              <li><router-link to="/services">网站 / 管理系统</router-link></li>
              <li><router-link to="/services">UI/UX 设计服务</router-link></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>联系我们</h4>
            <ul>
              <li><svg viewBox="0 0 1024 1024" width="16" height="16" style="vertical-align:middle; margin-right:4px;"><path d="M512 0C229.248 0 0 229.248 0 512s229.248 512 512 512 512-229.248 512-512S794.752 0 512 0z" fill="#12B7F5"/><path d="M683.008 503.808c-1.024 15.872-12.288 86.016-70.144 129.536l77.312 86.528c4.096 4.608 6.144 10.24 5.632 15.872-0.512 10.24-9.216 18.432-21.504 18.432h-159.232c-11.264 0-20.48-6.656-22.528-15.872-0.512-4.608 1.024-9.216 4.096-13.312l59.904-65.536c-71.68-10.24-119.808-56.832-132.608-121.344-2.56-13.312 2.048-24.064 9.728-26.624 4.608-1.536 9.728 0 13.824 3.584 32.256 27.648 82.432 45.056 139.264 45.056 56.832 0 107.52-17.408 139.776-45.056 4.096-3.584 9.216-5.12 13.312-3.584 7.68 2.56 12.288 13.312 9.728 26.624z" fill="#FFFFFF"/></svg>QQ：{{ company.company_phone || '964539086' }}</li>
              <li v-if="company.company_mobile">📞 <a :href="'tel:' + mobileRaw" style="color:#93c5fd;text-decoration:none;">{{ mobileMasked }}</a></li>
              <li>📧 {{ company.company_email || 'business@huizhiyunma.com' }}</li>
              <li>💬 微信</li>
              <li><img :src="'/uploads/wechat_qr.png'" alt="微信二维码" style="width:100px; height:100px; border-radius:6px; margin-top:4px;"></li>
              <li>📍 {{ company.company_address }}</li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>数据</h4>
            <ul>
              <li>服务客户 <strong style="color:white; margin-left:6px;">{{ company.stat_clients || '120+' }}</strong></li>
              <li>成功案例 <strong style="color:white; margin-left:6px;">{{ company.stat_cases || '200+' }}</strong></li>
              <li>行业经验 <strong style="color:white; margin-left:6px;">{{ company.stat_experience || '8年+' }}</strong></li>
            </ul>
          </div>
        </div>
        <div class="copyright">
          © {{ year }} 汇智云码科技 · 让企业拥有属于自己的 App 与小程序<br>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" style="color:#64748B; text-decoration:none;">{{ company.icp_record }}</a>
          <span style="margin:0 6px; color:#475569;">|</span>
          <a href="https://beian.mps.gov.cn/#/" target="_blank" rel="noopener noreferrer" style="color:#64748B; text-decoration:none;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAV5JREFUOE+lkzlOQzEQhmeVK+QKXIFfKnIEOAIFBQ0FBR0FByAnoKAgL0dARUFFRwEFBQEFBQ0FCAlJdpwvj/PiOM6bpKGR7dGM5/9nj2c8Pj+fz+fz+fxXkiRJkiRJkiRJkiRJkiRJkqRQUZKiJM0PkrC4uLhUq9WWa7XaUqVSWa5Wq8u1Wm2pXq8vNxqN5UajsdRsNpeazWa52WwuNZvNckmSpElpOp0uTyaTyXQ6nUyn08l0Opk0TdNp0zR7SZKklZWVlY1arXZYqVQOO53OYafTOWw2m4ftdnu/3+8fDIfDw263e9jpdA6bzeZhu90+zLJsP0kSN03TvSRJ3DRJ3DRJ3EF/f3+/VCodiWH7EbquC4ZhwDRNqKoKsixDURSIoggAYJqGodvt/k3DcDweYzKZYDAYoNfrQdd1qKoKURQBADRNw3g8Rr/f/4uGcDodYzKZoNvtotVqQZZlSJIEQRDw/PyMNMv+VA3+P4EvFAZY0jjbYRkAAAAASUVORK5CYII=" style="width:16px; height:16px; vertical-align:middle; margin-right:4px;">{{ company.public_security }}</a>
        </div>
      </div>
    </footer>
    <AiChatWidget v-if="$route.path !== '/admin'" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import AiChatWidget from './components/AiChatWidget.vue';
import { getCity } from './city.js';

const route = useRoute();
const company = ref({});
const menuOpen = ref(false);
const mobileParts = computed(() => {
  const m = (company.value && company.value.company_mobile) || '';
  return m ? [m.slice(0,3), m.slice(3,7), m.slice(7)] : [];
});
const mobileRaw = computed(() => mobileParts.value.join(''));
const mobileMasked = computed(() => mobileParts.value.length ? mobileParts.value[0] + '-' + mobileParts.value[1] + '-' + mobileParts.value[2] : '');
const year = new Date().getFullYear();
watch(() => route.path, () => { menuOpen.value = false; });
const cityInfo = getCity();
const cityName = cityInfo ? cityInfo.name : null;

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function replaceQingdao(text) {
  if (!cityName || !text) return text;
  // If text contains 青岛, replace it
  if (text.includes('\u9752\u5c9b')) {
    return text.replace(/\u9752\u5c9b/g, cityName);
  }
  // If on city subdomain but no 青岛 to replace, inject city name
  // For titles: add city prefix
  if (text.includes('_汇智云码科技')) {
    return text.replace('_汇智云码科技', '_' + cityName + '_汇智云码科技');
  }
  if (text.includes('| 汇智云码科技')) {
    return text.replace('| 汇智云码科技', '| ' + cityName + '软件开发公司');
  }
  // For descriptions: add city prefix
  if (text.includes('汇智云码科技 -')) {
    return text.replace('汇智云码科技 -', cityName + '汇智云码科技 -');
  }
  if (text.includes('汇智云码科技专业')) {
    return text.replace('汇智云码科技专业', cityName + '汇智云码科技专业');
  }
  return text;
}

// Replace 青岛 in all visible text nodes under an element
function replaceTextInDOM(root) {
  if (!cityName) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.nodeValue && node.nodeValue.includes('\u9752\u5c9b')) {
      node.nodeValue = node.nodeValue.replace(/\u9752\u5c9b/g, cityName);
    }
  });
}

// Dynamically set page title, description, keywords, OG tags with city name
// On city subdomains: spa_index.html already has correct city-specific SEO tags,
// so we do NOT override them. Only update canonical URL and DOM text.
// On main site: override with route meta (original behavior).
watch(() => route.meta, (meta) => {
  // Update title/description/keywords/OG on all domains
  // On city subdomains, replaceQingdao replaces city name
  if (meta && meta.title) {
    document.title = replaceQingdao(meta.title);
  }
  if (meta && meta.description) {
    setMeta('description', replaceQingdao(meta.description));
  }
  if (meta && meta.keywords) {
    setMeta('keywords', replaceQingdao(meta.keywords));
  }
  if (meta && meta.ogTitle) {
    setMeta('og:title', replaceQingdao(meta.ogTitle), 'property');
  }
  if (meta && meta.ogDescription) {
    setMeta('og:description', replaceQingdao(meta.ogDescription), 'property');
  }
  // (spa_index.html from generate.js has the correct city-specific values)
  // But still update canonical URL on both
  if (meta && meta.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', meta.canonical);
  } else {
    // Auto-generate canonical from current path
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', window.location.origin + route.path);
  }
  // Replace 青岛 in DOM text after route change (both main and city)
  nextTick(() => {
    replaceTextInDOM(document.body);
  });
}, { immediate: true });

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/company');
    if (data.code === 0) company.value = data.data;
  } catch (e) { /* default */ }
  // MutationObserver: auto-replace 青岛 whenever DOM changes (API data, Vue re-render, etc.)
  if (cityName) {
    const observer = new MutationObserver(() => {
      replaceTextInDOM(document.body);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Initial replace
    nextTick(() => { replaceTextInDOM(document.body); });
  }
  // 触发预渲染完成事件
  document.dispatchEvent(new Event('render-event'));
});
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
<style>
.city-dropdown {
  position: relative;
  display: inline-block;
}
.city-trigger {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--text);
  transition: background 0.2s;
}
.city-trigger:hover {
  background: rgba(0,0,0,0.05);
}
.city-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 12px;
  min-width: 200px;
  z-index: 100;
  max-height: 400px;
  overflow-y: auto;
}
.city-dropdown:hover .city-menu {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}
.city-menu a {
  display: block;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  text-decoration: none;
  transition: background 0.15s;
}
.city-menu a:hover {
  background: #f3f4f6;
  color: #1e40af;
}
.city-all {
  grid-column: 1 / -1;
  text-align: center;
  color: #1e40af !important;
  font-weight: 500;
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 12px !important;
}
</style>

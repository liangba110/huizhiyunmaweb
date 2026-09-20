#!/usr/bin/env node
/**
 * 汇智云码科技 - SEO 静态页 + sitemap 生成器
 * 作用：为纯 SPA 网站生成可被百度/搜索引擎抓取的静态 HTML 页面和 sitemap.xml
 * 运行：node generate.js   （需在 backend 目录下，读取 .env 连接数据库）
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
// 自动匹配 vite 构建后的带 hash CSS，避免城市静态页引用已失效的旧 hash 文件
var MAIN_CSS = (function () {
  try {
    var hit = fs.readdirSync(path.join(DIST, 'assets'))
      .filter(function (name) { return /^index-.*\.css$/.test(name); })
      .sort().pop();
    if (hit) return hit;
  } catch (e) {}
  return 'index.css';
})();
const CASES_IMG_DIR = path.join(DIST, 'seo', 'images', 'cases');
const CASE_COVER_FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc';
const SITE = 'https://openai2000.cn';
const SITE_WWW = 'https://openai2000.cn';

// ---------- 数据库连接（主库） ----------
async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 3,
  });
}

// ---------- HTML 转义 ----------
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function trunc(s, n) {
  if (!s) return '';
  s = String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}
// 截断标题（保留完整词，不超过n个字符）
function truncTitle(s, n) {
  if (!s) return '';
  s = String(s).trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}
function truncHtml(s, n) {
  if (!s) return '';
  s = stripHtml(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// shell 单引号转义（供 execSync 拼命令使用）
function shq(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

// 页脚备案信息（由主流程从 company_info 注入，供蜘蛛可见）
let FOOTER_ICP = '';
let FOOTER_BEIAN = '';
// 案例总数（由主流程从数据库读取，用于文案中的动态数字）
let CASES_TOTAL = 0;
function casesCountText() {
  return CASES_TOTAL >= 200 ? `${CASES_TOTAL}+` : `${CASES_TOTAL}`;
}
// ---------- JSON-LD 结构化数据 ----------
function getMobile(info) {
  return (info && (info.company_mobile || info.mobile) || '').trim();
}
function maskMobile(m) {
  return m ? m.slice(0,3) + '-' + m.slice(3,7) + '-' + m.slice(7) : '';
}
function orgJsonLd(info) {
  const name = (info && info.company_name) || '汇智云码科技';
  const addr = (info && info.company_address) || '';
  const phone = (info && (info.company_mobile || info.company_phone)) || '';
  const email = (info && info.company_email) || '';
  const intro = (info && info.company_intro) ? trunc(info.company_intro, 200) : '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: SITE + '/',
    logo: SITE + '/favicon.svg',
    description: intro,
    address: { '@type': 'PostalAddress', streetAddress: addr, addressCountry: 'CN' },
    telephone: phone,
    email,
  }) + '</script>';
}
// 统一日期为 ISO 8601（Article 富媒体结果要求）
function isoDate(v) {
  if (!v) return '';
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/\.\d{3}Z$/, '+08:00');
}
function articleJsonLd(a) {
  const url = `${SITE}/articles/${a.id}`;
  const date = isoDate(a.published_at);
  const modDate = isoDate(a.updated_at) || date;
  const img = `${SITE}/seo/images/articles/${a.id}.jpg`;
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: trunc(a.title, 110),
    description: trunc(a.summary, 160),
    image: [img],
    datePublished: date,
    dateModified: modDate,
    author: { '@type': 'Person', name: (a.author || '汇智云码科技技术团队'), worksFor: { '@type': 'Organization', name: '汇智云码科技' } },
    publisher: { '@type': 'Organization', name: '汇智云码科技', logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg' } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'zh-CN',
  }) + '</script>' + '\n' + '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: '资讯', item: SITE + '/articles' },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  }) + '</script>';
}

// FAQ Schema
function caseJsonLd(c) {
  const url = SITE + "/cases/" + c.id;
  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: c.title,
    description: trunc(c.description, 160),
    url,
    genre: c.category || undefined,
    about: c.technologies || undefined,
    creator: { "@type": "Organization", name: "汇智云码科技", url: SITE + "/" },
  };
  const bc = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "开发案例", item: SITE + "/cases" },
      { "@type": "ListItem", position: 3, name: c.title, item: url },
    ],
  };
  return "<script type=\"application/ld+json\">" + JSON.stringify(ld) + "</script>" + "\n" +
         "<script type=\"application/ld+json\">" + JSON.stringify(bc) + "</script>";
}
function faqJsonLd() {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      { '@type': 'Question', 'name': '做一个微信小程序要多少钱？', 'acceptedAnswer': { '@type': 'Answer', 'text': '微信小程序开发费用根据功能复杂度而定。基础展示型约2000-5000元，电商类约5000-15000元，复杂定制15000元起。汇智云码科技提供标准化套餐和完全定制两种方案，源码交付，价格透明。' }},
      { '@type': 'Question', 'name': 'APP开发需要多长时间？', 'acceptedAnswer': { '@type': 'Answer', 'text': 'APP开发周期取决于功能复杂度。简单展示型约4-6周，中等功能约8-12周，复杂APP约12-20周。汇智云码科技采用敏捷开发模式，每周可演示可验收。' }},
      { '@type': 'Question', 'name': '汇智云码科技是正规公司吗？', 'acceptedAnswer': { '@type': 'Answer', 'text': '汇智云码科技是正规注册的软件开发公司，2020年成立于青岛胶州，拥有鲁ICP备2026038130号-1备案。核心团队来自腾讯、阿里、字节，已服务120+企业客户，累计交付200+项目。' }},
      { '@type': 'Question', 'name': '企业网站建设哪家好？', 'acceptedAnswer': { '@type': 'Answer', 'text': '选择网站建设公司需关注：技术团队实力、案例数量与质量、源码是否交付、售后服务保障。汇智云码科技提供源码交付、1年免费维护、终身技术支持。' }},
      { '@type': 'Question', 'name': '青岛软件开发公司有哪些推荐？', 'acceptedAnswer': { '@type': 'Answer', 'text': '青岛软件开发公司中，汇智云码科技专注移动应用与小程序定制开发，核心团队来自腾讯、阿里、字节，拥有8年+行业经验，200+成功案例。' }}
    ]
  }) + '</script>';
}

function serviceJsonLd(description) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: '软件开发服务（小程序开发/APP定制/企业网站建设）',
    provider: { '@type': 'Organization', name: '汇智云码科技', url: SITE + '/' },
    areaServed: 'CN',
    description: trunc(description, 200),
  }) + '</script>';
}


function websiteJsonLd() {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '汇智云码科技',
    url: SITE + '/',
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: SITE + '/articles?keyword={search_term_string}' },
      'query-input': 'required name=search_term_string'
    }
  }) + '</' + 'script>';
}
function localBusinessJsonLd(info, overrideUrl, areaCity) {
  var name = (info && info.company_name) || '汇智云码科技';
  var addr = (info && info.company_address) || '山东省青岛市胶州市阜安街道东关大街8号中央公园写字楼11楼';
  var phone = (info && info.company_phone) || '';
  var email = (info && info.company_email) || '';
  var intro = (info && info.company_intro) ? trunc(info.company_intro, 200) : '青岛小程序开发、APP定制开发、企业网站建设服务商';
  var obj = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: name,
    url: overrideUrl || (SITE + '/'),
    logo: SITE + '/favicon.svg',
    description: intro,
    image: SITE + '/seo/images/og-cover.png',
    address: { '@type': 'PostalAddress', addressCountry: 'CN', addressRegion: '山东省', addressLocality: '青岛市', streetAddress: addr },
    areaServed: areaCity ? { '@type': 'City', name: areaCity } : 'CN',
    priceRange: '¥¥',
    openingHours: ['Mo-Sa 09:00-18:00'],
    sameAs: []
  };
  var lbMobile = getMobile(info);
  if (lbMobile) obj.telephone = lbMobile;
  if (email) obj.email = email;
  return '<script type="application/ld+json">' + JSON.stringify(obj) + '</' + 'script>';
}
function collectionPageJsonLd(name, desc) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: name, description: desc, url: SITE + '/city',
    isPartOf: { '@type': 'WebSite', url: SITE + '/', name: '汇智云码科技' }
  }) + '</' + 'script>';
}
// 重点城市互链模块（城市首页底部"其他热门城市"，助蜘蛛发现与权重传递）
function cityCrossLinks(currentSd) {
  var order = ['qingdao','jinan','beijing','shanghai','guangzhou','shenzhen','hangzhou','chengdu','nanjing','wuhan','xian','suzhou','tianjin','chongqing','zhengzhou','changsha','ningbo','yantai','weifang','linyi'];
  var nameMap = {qingdao:'青岛',jinan:'济南',beijing:'北京',shanghai:'上海',guangzhou:'广州',shenzhen:'深圳',hangzhou:'杭州',chengdu:'成都',nanjing:'南京',wuhan:'武汉',xian:'西安',suzhou:'苏州',tianjin:'天津',chongqing:'重庆',zhengzhou:'郑州',changsha:'长沙',ningbo:'宁波',yantai:'烟台',weifang:'潍坊',linyi:'临沂'};
  var links = order.filter(function(sd){ return sd !== currentSd; }).slice(0, 12).map(function(sd){
    return '<a href="https://' + sd + '.openai2000.cn/" style="display:inline-block;margin:4px 8px 4px 0;padding:6px 14px;background:#f1f5f9;border-radius:16px;font-size:14px;color:#1e40af;text-decoration:none;">' + nameMap[sd] + '</a>';
  }).join('');
  return '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;"><h2>其他热门城市服务</h2><div>' + links + '</div></section>';
}

// ---------- 生成一个标准 SEO 页面 ----------
function seoPage(page, opts = {}) {
  const {
    title = opts.pageTitle || '汇智云码科技',
    description = '',
    keywords = '企业网站建设,小程序开发,APP定制开发,软件开发,青岛软件公司',
    canonical = `${SITE}${page}`,
    body = '',
    isHome = false,
    jsonLd = '',
    robots = 'index,follow',
    ogImage = `${SITE}/seo/images/og-cover.png`,
    ogType = 'website',
    breadcrumb = null,
    noCanonical = false,
  } = opts;

  // 【SEO】可见面包屑导航（此前只有 BreadcrumbList schema，页面无可见面包屑）
  var bcHtml = '';
  if (Array.isArray(breadcrumb) && breadcrumb.length) {
    var items = [{ name: '首页', url: SITE + '/' }].concat(breadcrumb);
    bcHtml = '<nav class="breadcrumb" aria-label="\u5f53\u524d\u4f4d\u7f6e" style="max-width:1200px;margin:0 auto;padding:14px 20px;font-size:14px;color:#6b7280;">'
      + items.map(function (it, i) {
          return (i ? '<span style="margin:0 6px;color:#cbd5e1;">›</span>' : '')
            + (i === items.length - 1
                ? '<span aria-current="page" style="color:#1e3a8a;font-weight:600;">' + esc(it.name) + '</span>'
                : '<a href="' + (it.url || '#') + '" style="color:#2563eb;text-decoration:none;">' + esc(it.name) + '</a>');
        }).join('')
      + '</nav>';
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="baidu-site-verification" content="codeva-geushDpNvl" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(keywords)}">
${noCanonical ? '' : '<link rel="canonical" href="' + canonical + '">'}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="zh_CN">
<meta property="og:site_name" content="汇智云码科技">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="robots" content="${robots}">
<link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg">
<link rel="stylesheet" href="${SITE}/seo.css">
<!-- 百度统计 -->
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?289eab39430e2f97aa77b242004802b3";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>
${jsonLd}
</head>
<body>
<header class="seo-header">
  <div class="seo-wrap">
    <a class="seo-logo" href="${SITE}/">汇智云码科技</a>
    <nav class="seo-nav">
      <a href="${SITE}/">首页</a>
      <a href="${SITE}/services">服务</a>
      <a href="${SITE}/cases">案例</a>
      <a href="${SITE}/templates">模板商城</a>
      <a href="${SITE}/articles">资讯</a>
      <a href="${SITE}/about">关于</a>
      <a href="${SITE}/contact">联系</a>
    </nav>
  </div>
</header>
<main class="seo-main">
${bcHtml}
${body}
</main>
<footer class="seo-footer">
  <div class="seo-wrap">
    <p>汇智云码科技 - 专业企业网站建设 / 小程序开发 / APP定制开发服务商</p>
    <p>电话咨询 / 微信同号，快速响应您的建站与开发需求</p>
    <p><a href="${SITE}/contact">联系我们</a></p>
    <p>姐妹站：<a href="https://ai.openai2000.cn">智云互联AI - AI工具导航与实操教程</a></p>

    <p>${FOOTER_ICP ? `<a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow noopener">${esc(FOOTER_ICP)}</a>` : ''}${FOOTER_BEIAN ? `　<a href="https://beian.mps.gov.cn/#/" target="_blank" rel="nofollow noopener">${esc(FOOTER_BEIAN)}</a>` : ''}</p>
  </div>
</footer>
</body>
</html>
`;
}

function cardGrid(items, kind) {
  return `<section class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${items.map(it => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;">
  ${it.image ? `<img class="card-img" style="width:100%;height:auto;border-radius:8px;margin-bottom:16px;display:block;" src="${it.image}" alt="${esc(it.title)}" loading="lazy" width="800" height="450">` : ''}
  <h3><a href="${SITE}${it.href}">${esc(it.title)}</a></h3>
  ${it.meta ? `<p class="meta" style="color:#6b7280;font-size:14px;">${esc(it.meta)}</p>` : ''}
  ${it.summary ? `<p>${esc(trunc(it.summary, 100))}</p>` : ''}
</article>`).join('\n')}
</section>`;
}

// ---------- 各页面 body ----------
function homeBody(services, cases, articles, templates) {
  // 【SEO】内链安全：只引用当前已发布集合（防止生成期数据变动导致死链）
  var _homeIds = new Set((articles || []).map(function (x) { return x.id; }));
  return `
<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;">
  <h1>青岛小程序开发与 APP 定制开发服务</h1>
  <p>汇智云码科技（青岛）专注微信小程序开发、APP 定制开发与企业网站建设。核心团队来自腾讯、阿里、字节，120+ 企业客户，源码交付，终身维护。</p>
  <p style="margin-top:18px;"><a href="${SITE}/#free-resource" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费领取《2026 企业开发需求梳理与报价模板》</a></p>
</section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>核心服务</h2>
  <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
    ${services.map(s => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="${SITE}/services">${esc(s.title)}</a></h3><p>${esc(trunc(s.description, 120))}</p></article>`).join('\n')}
  </div>
</section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>成功案例</h2>
  ${cardGrid(cases.slice(0, 6).map(c => ({ href: `/cases/${c.id}`, title: c.title, meta: c.client, summary: c.description, image: `${SITE}/seo/images/cases/${c.id}.jpg` })), 'case')}
</section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>企业网站模板</h2>
  ${cardGrid(templates.map(t => ({ href: `/templates`, title: `${t.name}（¥${Number(t.price).toFixed(0)}）`, meta: `${t.level === 'standard' ? '基础版' : t.level === 'pro' ? '专业版' : '至尊版'}`, summary: t.description })), 'tpl')}
</section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>最新资讯</h2>
  ${cardGrid(articles.slice(0, 6).map(a => ({ href: `/articles/${a.id}`, title: a.title, meta: a.published_at ? String(a.published_at).slice(0, 10) : '', summary: a.summary })), 'article')}
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 0;">
  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
    <h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">我们能为你做什么</h2>
    <p>汇智云码科技是一家位于青岛的软件开发公司，自 2018 年起专注为中小企业提供数字化解决方案。我们不接硬件开发、不做纯设计外包，把精力集中在三件最擅长的事上：<strong>微信小程序开发、APP 定制开发、企业网站建设</strong>。此外承接企业内部的 SaaS 系统与定制管理软件开发。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">微信小程序开发</h3>
    <p>小程序是我们做得最多的品类。扫码点餐、电商商城、预约到店、会员管理、企业展示、工具应用——这些场景我们都有成熟的技术积累，不是从零摸索。技术路线上，功能简单的项目用微信原生开发保证体验，需要同时覆盖微信、支付宝、抖音多端的项目用 uni-app 或 Taro 跨端框架，一套代码复用，能省下三到四成开发成本。小程序开发周期通常 2-6 周，但请注意<strong>上线前必须完成 ICP 备案</strong>，各省审核速度不同，快则 3 天慢则 20 个工作日，这个时间要提前算进你的上线计划。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">APP 定制开发</h3>
    <p>需要推送通知、调用相机蓝牙定位等硬件能力、离线可用，或者要上架应用商店建立品牌认知时，APP 比小程序更合适。我们提供 iOS 与 Android 双端开发，覆盖原生（Swift / Kotlin）、React Native、Flutter 三条技术路线。选型没有标准答案：追求极致性能与复杂硬件联动的选原生，追求开发效率与成本可控的选 Flutter 或 React Native。我们会在需求阶段出具书面选型说明，把每条路线的利弊、工期与费用差异讲清楚，再让你决策。APP 开发周期通常 6-16 周。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">企业网站建设</h3>
    <p>网站是企业最稳定的数字资产——不依赖任何平台规则、不会被封号、是搜索引擎流量的主入口。我们建设的企业官网全部采用响应式设计，电脑平板手机三端自适应，标配 HTTPS、SEO 基础优化（标题描述、结构化数据、sitemap、robots）、访问统计与基础安全防护。建站周期 2-6 周，上线后提供后台使用培训，你可以自行更新新闻、产品、案例，不必每次改文字都找技术。这一点看似简单，却是很多"上线即死站"的根源。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">为什么选择我们</h3>
    <p><strong>自有团队直营交付。</strong>需求分析、设计、开发、测试、运维全部由公司正式员工完成，不转包。外包行业最大的问题就是层层转包导致质量衰减与工期失控，我们从结构上避免了这一点。</p>
    <p><strong>源码完整交付。</strong>交付物包含完整前后端源码、数据库脚本、部署文档。不做"只给账号不给源码"的技术锁定，你可以自由选择后续由谁维护。</p>
    <p><strong>价格明码标价。</strong>标准化套餐在官网公开标价，定制项目出具逐项列明的报价单，签约后不加价（需求变更除外）。</p>
    <p><strong>行业经验可复用。</strong>已服务餐饮、零售、教育、医疗、房产、汽车、旅游、酒店、美业、家政、婚庆、物流、农业、制造等 14 个行业，对行业业务流程有现成认知，能显著缩短需求沟通周期。</p>

    <p style="margin-top:24px;text-align:center;">
      <a href="${SITE}/packages" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看明码标价套餐</a>
      <a href="${SITE}/solutions" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">行业解决方案</a>
      <a href="${SITE}/about" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">了解公司团队</a>
    </p>
  </div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 0;">
  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
    <h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">常见问题</h2>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">开发一个项目大概要多少钱？</h3>
    <p>价格取决于功能量，没有一个"起步价"能回答这个问题。我们官网的<a href="${SITE}/packages">开发套餐页面</a>按小程序、APP、网站三大类目给出了标准化配置的明码标价，可以据此判断大概区间。定制项目在需求确认后出具逐项报价单，列明每项功能的工时与费用。需要提醒的是：看到"小程序 3000 元全包"这类报价时请谨慎——这类通常是模板改字，无法承载真实业务逻辑，后期改造成本往往高于重做。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">开发周期多久？</h3>
    <p>网站建设 2-6 周，小程序 2-6 周，APP 6-16 周，SaaS 系统 2-6 个月。以上是纯开发时间，不含 ICP 备案与平台审核时间（建议预留 2-4 周缓冲）。我们支持分期开发——先交付核心功能上线验证业务，跑通后再迭代次要功能，这样能降低前期投入风险。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">源码会交付吗？后期维护怎么算？</h3>
    <p>源码全部交付，包含前后端代码、数据库结构与部署文档。验收后提供 3-12 个月免费维护期（视项目规模而定），期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。免费期结束后可签年度维护协议（通常为建设费用的 15%-20%），或按次付费。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">你们在青岛，外地客户怎么合作？</h3>
    <p>公司六成以上客户来自山东省外。合作方式以线上为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。多年实践下来，远程协作与本地合作在效率上没有实质差别。必要时也可安排驻场，差旅实报实销。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">需求还没想清楚，可以先聊聊吗？</h3>
    <p>可以，而且我们建议这样做。需求和方案梳理完全免费，不签约也没有关系。实际经验中，客户最初描述的需求与最终实现的功能常有 30%-50% 的差异，这个差异在写代码之前暴露出来，比开发到一半再改要省太多成本。<a href="${SITE}/contact">把大致想法告诉我们</a>，我们会帮你把需求理清楚。</p>
  </div>
</section>
`;
}

function servicesBody(services) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业建站 · 小程序 · APP开发服务</h1><p>从需求分析到上线运营的一站式数字化解决方案。源码交付，终身维护。</p></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;"><h2 ${H2}>服务项目与参考价格</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${services.map(s => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>${esc(s.title)}</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">参考价格：¥${Number(s.price_min).toLocaleString()} - ¥${Number(s.price_max).toLocaleString()}</p><p>${esc(trunc(s.description, 150))}</p></article>`).join('\n')}
</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>三大主线服务详解</h2>

<h3 ${H3}>一、微信小程序开发</h3>
<p>微信小程序是当前中小企业获客成本最低的线上入口之一。汇智云码提供的<strong>小程序开发</strong>服务覆盖电商商城、点餐外卖、预约到店、会员管理、内容资讯、企业展示、工具类应用等主要场景，支持微信支付、微信登录、订阅消息、企业微信互通、直播带货等全部官方能力。</p>
<p>技术实现上，我们根据项目复杂度在小程序原生开发与 uni-app / Taro 跨端框架之间做选型：功能简单、追求极致体验的项目用原生；需要在微信小程序、支付宝小程序、抖音小程序、H5 多端同时上线的项目用跨端框架，一套代码多端复用，可节省 30%-40% 的开发成本。</p>
<p>小程序的开发周期通常在 2-6 周。我们需要提醒客户的是：<strong>小程序上线前必须完成 ICP 备案与微信平台审核</strong>，备案耗时约 3-20 个工作日（各省通信管理局审核速度不同），这段时间应提前规划，避免影响业务上线节点。</p>

<h3 ${H3}>二、APP 定制开发</h3>
<p>当业务需要推送通知、调用手机硬件（相机、蓝牙、NFC、定位）、离线使用，或者需要上架应用商店建立品牌认知时，APP 是比小程序更合适的选择。我们提供 iOS 与 Android 双端<strong>APP 定制开发</strong>，技术路线包括原生开发（Swift / Kotlin）、React Native 与 Flutter 跨平台开发三条路线。</p>
<p>选型建议：对性能与硬件调用要求极高的项目（如视频处理、大型游戏、复杂蓝牙设备联动）选原生；追求开发效率与成本可控、UI 交互常规的项目选 Flutter 或 React Native，一套代码双端运行，能显著压缩工期与预算。我们在需求阶段会出具具体的选型说明，把利弊讲清楚再让客户决策。</p>
<p>APP 开发周期通常 6-16 周，上架 App Store 需通过苹果审核（首次审核建议预留 1-2 周，含被驳回后修改重提的时间），安卓各应用市场审核相对宽松，一般 1-3 个工作日出结果。</p>

<h3 ${H3}>三、企业网站建设</h3>
<p>网站是企业最稳定的数字资产——它不受平台规则变动影响，不依赖第三方账号，且是百度等搜索引擎的流量主入口。我们提供的<strong>企业网站建设</strong>服务包括企业官网、品牌形象站、营销型落地页、外贸多语言站、产品展示站以及后台内容管理系统（CMS）。</p>
<p>所有网站均采用响应式设计，在电脑、平板、手机三端自适应；标配 HTTPS、SEO 基础优化（TDK、结构化数据、sitemap、robots）、访问统计接入与基础安全防护。建站周期通常 2-6 周，域名与服务器可代购也可使用客户现有资源。</p>
<p>网站上线后我们提供完整的后台使用培训，客户可自行更新新闻、产品、案例等内容，无需每次改动都找技术。这一步看似简单，但决定了网站能否长期保持活力——我们遇到过太多"上线即死站"的案例，根本原因就是客户无法自行更新内容。</p>

<h3 ${H3}>四、SaaS 系统与定制软件</h3>
<p>除上述三大主线外，我们还承接企业内部的<strong>SaaS 系统开发与定制软件</strong>项目，包括 CRM 客户管理、ERP 进销存、OA 协同办公、工单派单、数据看板、多租户 SaaS 平台等。这类项目通常涉及复杂的角色权限体系、审批流程与数据报表，需求调研阶段会更长（通常 1-2 周），开发周期 2-6 个月不等。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>常见问题</h2>
<h3 ${H3}>1. 开发周期一般多长？</h3>
<p>小程序开发周期通常为 2-6 周，APP 开发为 6-16 周，网站建设为 2-6 周，SaaS 系统为 2-6 个月。具体取决于功能复杂度和页面数量。需要提醒的是，上面说的是纯开发时间，不含备案与平台审核时间，实际排期时建议预留 2-4 周缓冲。</p>
<h3 ${H3}>2. 源码是否交付？</h3>
<p>是的，所有项目源码全部交付客户，包含前端代码、后端代码、数据库结构与部署文档。我们不采用"只给账号不给源码"的托管模式，客户完全掌握自己的数字化资产，后续可自行维护或交由任意第三方接手。</p>
<h3 ${H3}>3. 后期维护费用如何？</h3>
<p>项目交付后提供 3-12 个月免费维护期（视项目规模而定），期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。免费期结束后可按年签订维护协议，费用通常为建设费用的 15%-20%；也可以选择不签维护协议，需要时按次付费。</p>
<h3 ${H3}>4. 可以先做一部分功能试试吗？</h3>
<p>可以。我们支持分期开发：先交付核心功能上线验证业务模式，跑通后再迭代次要功能。这种方式能显著降低前期投入风险，尤其适合业务模式尚在摸索阶段的创业项目。</p>
<h3 ${H3}>5. 已有系统能二次开发吗？</h3>
<p>可以，但需要先做代码评估。如果原系统技术栈过旧、代码结构混乱，二次开发的成本可能接近重做，这种情况我们会如实告知并给出两套方案对比，由客户选择。我们不会为了接单而隐瞒技术风险。</p>
<h3 ${H3}>6. 需求变更怎么处理？</h3>
<p>开发过程中提出新需求是常态。我们按"人天"计价：小改动（1-2 天工作量）通常免费包含；较大改动或新增功能模块，评估工时后出具增量报价单，确认后执行。所有变更都会在项目群里书面记录，避免后期扯皮。</p>
<h3 ${H3}>7. 你们在青岛，外地客户怎么合作？</h3>
<p>公司 60% 以上客户来自山东省外。合作方式为线上为主：需求沟通用微信/视频会议，原型与设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。必要时可安排驻场开发，差旅费用实报实销。多年实践下来，远程协作的效率与本地合作没有实质差别。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;text-align:center;">
<h2 ${H2}>不确定该选哪种方案？</h2>
<p>把您的业务需求告诉我们，我们会免费给出技术选型建议和参考报价，不签约也没关系。</p>
<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取方案与报价</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">14 个行业解决方案</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/templates">网站模板商城</a> ｜ <a href="${SITE}/articles">开发知识文章</a></p>
</div>
</section>`;
}

function casesBody(cases) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>开发案例</h1><p>${casesCountText()} 成功案例，涵盖餐饮、制造、教育、医疗、跨境、酒店等多个行业。</p></section>
${cardGrid(cases.map(c => ({ href: `/cases/${c.id}`, title: c.title, meta: `${c.category} · ${c.client}`, summary: c.description, image: `${SITE}/seo/images/cases/${c.id}.jpg` })), 'case')}
<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 60px;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">关于这些案例</h2>
<p>上面展示的是汇智云码科技自有团队交付的部分项目。出于客户商业保密要求，部分案例仅展示项目名称与功能概要，涉及内部数据与业务流程的细节未做公开。如果你是同行或研究用途，需要了解具体技术实现，欢迎<a href="${SITE}/contact">联系我们</a>交流。</p>
<p>案例按行业分类，可以对照查看与你业务相近的项目做了什么功能、用了什么技术方案。如果你在案例里看到和自己需求相似的场景，直接告诉我们案例编号，沟通效率会高很多。</p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/about">公司团队</a></p>
</div>
</section>`;
}

function caseBody(c, allCases, solutions) {
  // 【SEO】相关案例内链（同分类优先，不足补其他）
  var pool = Array.isArray(allCases) ? allCases : [];
  var same = pool.filter(function (x) { return x.id !== c.id && x.category === c.category; });
  var other = pool.filter(function (x) { return x.id !== c.id && x.category !== c.category; });
  var related = same.concat(other).slice(0, 4);
  var relHtml = related.length ? '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>相关案例</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">'
    + related.map(function (x) {
        return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SITE + '/cases/' + x.id + '">' + esc(x.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(x.category) + ' · ' + esc(x.client || '') + '</p><p>' + esc(trunc(x.description, 90)) + '</p></article>';
      }).join('\n')
    + '</div></section>' : '';
  // 【SEO】同类服务/行业方案引导
  var solLink = '<p style="margin-top:20px;font-size:15px;color:#475569;">相关页面：<a href="' + SITE + '/services">开发服务详解</a> ｜ <a href="' + SITE + '/packages">明码标价套餐</a> ｜ <a href="' + SITE + '/solutions">行业解决方案</a> ｜ <a href="' + SITE + '/articles">开发知识文章</a></p>';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>${esc(c.title)}</h1><p class="meta" style="color:#6b7280;font-size:14px;">${esc(c.category)} · ${esc(c.client)}${c.technologies ? ' · ' + esc(c.technologies) : ''}</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><img class="case-img" loading="lazy" style="width:100%;max-width:900px;height:auto;border-radius:12px;margin:0 auto 24px;display:block;" src="${SITE}/seo/images/cases/${c.id}.jpg" alt="${esc(c.title)}_开发案例封面" width="800" height="450"></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">${c.content || esc(c.description || '')}</div>
<p><a href="${SITE}/cases">← 返回全部案例</a>　<a href="${SITE}/contact">获取同类方案</a></p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>客户评价</h2><div class="content" style="background:#f8fafc;padding:24px;border-radius:12px;margin:16px 0;"><div style="color:#f59e0b;font-size:24px;">★★★★★</div><p style="margin:12px 0;font-size:16px;line-height:1.8;">"与汇智云码合作非常愉快，开发周期短、质量高、售后响应快。强烈推荐！"</p><p style="color:#6b7280;">—— 项目负责人</p></div></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>项目问答</h2><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">
<h3>这个项目的主要技术栈是什么？</h3><p>${esc(c.technologies || '根据项目需求选用最适合的技术栈，确保性能和可维护性。')}</p>
<h3>项目开发周期多长？</h3><p>根据功能复杂度，通常为4-12周。我们会在需求确认后提供详细的项目排期。</p>
<h3>后期维护如何保障？</h3><p>我们提供3-12个月免费维护期，并可签订长期运维合同，确保系统稳定运行。</p>
</div></section>
${relHtml}
<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 60px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2>关于这个项目</h2>
<p>${esc(c.client || '该项目')}的合作从需求梳理开始。我们先用 1-2 周把业务流程、角色权限、数据结构逐项确认清楚，再进入原型设计与开发。这一步看起来慢，但它决定了后面不会因为需求反复而返工。</p>
<p>开发过程中按周交付可演示的版本，客户随时能看到已完成的部分并提出修改意见，而不是等到全部做完才第一次看到成品。每个里程碑完成后双方确认签字，再进入下一阶段。</p>
<p>技术上${esc(c.technologies || '根据业务场景选择合适的技术栈')}。选择标准不是新技术与否，而是团队能否长期维护——很多客户后续会自己接手运维，可维护性比技术先进性更重要。</p>
<p>上线后提供 6-12 个月免费维护期，覆盖程序缺陷修复、平台规则变化导致的适配调整、服务器迁移协助。之后可按年签维护协议，也可按次付费。</p>
${solLink}
</div></section>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"${esc(c.title)}的主要技术栈是什么？","acceptedAnswer":{"@type":"Answer","text":"${esc(c.technologies || '根据项目需求选用最适合的技术栈。')}"}},{"@type":"Question","name":"这个项目的开发周期多长？","acceptedAnswer":{"@type":"Answer","text":"根据功能复杂度，通常为4-12周。"}},{"@type":"Question","name":"后期维护如何保障？","acceptedAnswer":{"@type":"Answer","text":"提供3-12个月免费维护期，可签订长期运维合同。"}}]}</script>`;
}

var ARTICLES_PER_PAGE = 24;
function articlesBody(articles, page) {
  var cur = page || 1;
  var cats = {};
  articles.forEach(function (a) { var c = a.category || '行业洞察'; cats[c] = (cats[c] || 0) + 1; });
  var catList = Object.keys(cats).sort(function (x, y) { return cats[y] - cats[x]; });
  var catNav = '<section class="section" style="max-width:1200px;margin:0 auto;padding:36px 20px 0;"><h2 style="font-size:20px;color:#1e3a8a;margin:0 0 14px;">按分类浏览</h2><div style="display:flex;flex-wrap:wrap;gap:10px;">'
    + '<a href="' + SITE + '/articles" style="padding:8px 18px;background:#2563eb;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;">全部（' + articles.length + '）</a>'
    + catList.map(function (c) {
        return '<a href="' + SITE + '/articles?cat=' + encodeURIComponent(c) + '" style="padding:8px 18px;background:#f1f5f9;color:#334155;border-radius:20px;text-decoration:none;font-size:14px;">' + esc(c) + '（' + cats[c] + '）</a>';
      }).join('') + '</div></section>';
  var totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
  var list = articles.slice((cur - 1) * ARTICLES_PER_PAGE, cur * ARTICLES_PER_PAGE);
  var pager = '';
  if (totalPages > 1) {
    var pp = [];
    var mk = function (i, label, active) {
      var href = i === 1 ? SITE + '/articles' : SITE + '/articles/page/' + i;
      var st = active ? 'background:#2563eb;color:#fff;border:1px solid #2563eb;' : 'background:#fff;border:1px solid #cbd5e1;color:#334155;';
      return '<a href="' + href + '" style="padding:10px 18px;border-radius:8px;text-decoration:none;' + st + '">' + label + '</a>';
    };
    if (cur > 1) pp.push(mk(cur - 1, '上一页', false));
    for (var i = 1; i <= totalPages; i++) pp.push(mk(i, String(i), i === cur));
    if (cur < totalPages) pp.push(mk(cur + 1, '下一页', false));
    pager = '<nav class="pager" aria-label="分页导航" style="max-width:1200px;margin:0 auto;padding:36px 20px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + pp.join('') + '</nav>';
  }
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>行业资讯与开发知识</h1><p>网站建设、小程序开发、APP开发的技术干货与行业趋势。共 ${articles.length} 篇原创文章。</p></section>
${catNav}
<section class="section" style="max-width:1200px;margin:0 auto;padding:36px 20px 0;">
${cardGrid(list.map(a => ({ href: `/articles/${a.id}`, title: a.title, meta: `${a.category} · ${String(a.published_at).slice(0, 10)}`, summary: a.summary })), 'article')}
</section>
${pager}
<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">关于这些内容</h2>
<p>这里收录的是汇智云码技术团队在服务 120+ 企业客户过程中沉淀的实战经验，而非网络采集的二手资料。内容覆盖<strong>小程序开发、APP 定制开发、企业网站建设、SaaS 系统开发</strong>四条主线的技术选型、成本构成、合规要点与踩坑记录。</p>
<p>我们写这些文章的目的不是堆关键词，而是把客户在咨询中最常问、我们也最常解释的问题一次性写清楚——比如"小程序到底要花多少钱""备案为什么要等这么久""模板和定制到底差在哪"。如果你看完仍有疑问，欢迎<a href="${SITE}/contact">直接联系我们</a>，需求沟通与方案梳理是免费的。</p>
<p>如果你刚开始了解这个领域，建议按这个顺序阅读：先看<a href="${SITE}/packages">明码标价套餐</a>了解价格区间，再看<a href="${SITE}/services">服务详解</a>了解不同方案的适用场景，然后结合<a href="${SITE}/solutions">行业解决方案</a>判断自己属于哪一类需求。</p>
</div>
</section>`;
}

function articleSectionFig(n) {
  const hue = (n * 47) % 360;
  const cx = 120 + ((n * 60) % 200);
  const cap = '<figcaption style="color:#6b7280;font-size:13px;margin-top:8px;text-align:center;">图 ' + n + ' · 本章要点示意图</figcaption>';
  const svg = '<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="section illustration ' + n + '" style="width:100%;height:auto;border-radius:12px;display:block;">'
    + '<rect width="800" height="200" fill="hsl(' + hue + ',65%,22%)"/>'
    + '<circle cx="' + cx + '" cy="100" r="52" fill="hsl(' + hue + ',80%,58%)" opacity="0.9"/>'
    + '<circle cx="' + (cx + 30) + '" cy="78" r="18" fill="hsl(' + hue + ',85%,75%)" opacity="0.7"/>'
    + '<rect x="380" y="62" width="300" height="14" rx="7" fill="#ffffff" opacity="0.92"/>'
    + '<rect x="380" y="92" width="240" height="10" rx="5" fill="#ffffff" opacity="0.55"/>'
    + '<rect x="380" y="114" width="270" height="10" rx="5" fill="#ffffff" opacity="0.35"/>'
    + '<rect x="380" y="136" width="180" height="10" rx="5" fill="#ffffff" opacity="0.2"/>'
    + '</svg>';
  return '<figure class="article-fig" style="margin:24px 0;">' + svg + cap + '</figure>';
}
function addArticleFigs(content) {
  let i = 0;
  return String(content || '').replace(/<\/h[23]>/g, function(m) {
    i += 1;
    return m + articleSectionFig(i);
  });
}
function articleBody(a, articles, cases, solutions) {
  // 相关文章：同分类最多3篇，不足补最新文章（排除当前文章）
  const all = Array.isArray(articles) ? articles : [];
  const related = all.filter(x => x.id !== a.id && x.category === a.category).slice(0, 3);
  if (related.length < 3) {
    const used = new Set(related.map(x => x.id));
    used.add(a.id);
    const fill = all.filter(x => !used.has(x.id))
      .sort((p, q) => (q.id || 0) - (p.id || 0))
      .slice(0, 3 - related.length);
    related.push(...fill);
  }
  const relatedHtml = related.length ? `<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>相关文章</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${related.map(x => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="${SITE}/articles/${x.id}">${esc(x.title)}</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">${esc(x.category)} · ${String(x.published_at).slice(0, 10)}</p><p>${esc(trunc(x.summary, 80))}</p></article>`).join('\n')}
</div></section>` : '';
  
  // 相关案例：根据文章关键词匹配案例
  const allCases = Array.isArray(cases) ? cases : [];
  const articleText = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
  const caseKeywords = ['小程序', 'app', '网站', '开发', '餐饮', '教育', '医疗', '电商', '商城'];
  const matchedCases = allCases.filter(c => {
    const caseText = ((c.title || '') + ' ' + (c.description || '')).toLowerCase();
    return caseKeywords.some(kw => articleText.includes(kw) && caseText.includes(kw));
  }).slice(0, 3);
  const casesHtml = matchedCases.length ? `<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>相关案例</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${matchedCases.map(c => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="${SITE}/cases/${c.id}">${esc(c.title)}</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">${esc(c.client || '')}</p><p>${esc(trunc(c.description, 100))}</p></article>`).join('\n')}
</div></section>` : '';

  // 行业方案推荐
  const allSolutions = Array.isArray(solutions) ? solutions : [];
  const solutionKeywords = {'餐饮':'catering','教育':'education','医疗':'medical','电商':'retail','商城':'retail','美容':'beauty','酒店':'hotel','物流':'logistics','制造':'manufacturing','农业':'agriculture','房产':'realestate','汽车':'automotive','旅游':'tourism','婚庆':'wedding','家政':'housekeeping'};
  const matchedSolutions = allSolutions.filter(s => {
    return Object.keys(solutionKeywords).some(kw => articleText.includes(kw) && ((s.name || '').includes(kw) || (s.industry || '').includes(kw)));
  }).slice(0, 3);
  // 如果没匹配到具体行业，推荐通用方案
  const solutionsToShow = matchedSolutions.length ? matchedSolutions : allSolutions.slice(0, 3);
  const solutionsHtml = solutionsToShow.length ? `<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>行业解决方案</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${solutionsToShow.map(s => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="${SITE}/solutions/${s.slug || s.name}">${esc(s.name || s.industry)}</a></h3><p>${esc(trunc(s.description || s.summary || '', 100))}</p></article>`).join('\n')}
</div></section>` : '';
  
  // 检测是否为教程类文章，添加HowTo Schema
  const isTutorial = isTutorialArticle(a.title);
  const steps = isTutorial ? extractSteps(a.content || '') : null;
  const howToHtml = steps ? `<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>操作步骤</h2><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;"><ol>${steps.map(s => '<li style="margin-bottom:16px;"><strong>' + esc(s.title) + '</strong><br>' + esc(s.content.trim()) + '</li>').join('')}</ol></div></section>` : '';
  
  return `<nav class="breadcrumb" style="max-width:1200px;margin:0 auto;padding:16px 20px;font-size:14px;color:#6b7280;"><a href="${SITE}/">首页</a> › <a href="${SITE}/articles">资讯列表</a> › ${esc(a.title)}</nav>
<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>${esc(a.title)}</h1><p class="meta" style="color:#6b7280;font-size:14px;">${esc(a.category)} · ${esc(a.author || '汇智云码科技')} · ${String(a.published_at).slice(0, 10)}</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px;"><figure class="article-image" style="max-width:1200px;margin:0 auto;"><img src="${SITE}/seo/images/articles/${a.id}.jpg" alt="${esc(a.title)}" width="1200" height="630" style="width:100%;height:auto;border-radius:12px;display:block;" loading="eager"></figure></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">${addArticleFigs(a.content)}</div>
<p><a href="${SITE}/articles">← 返回资讯列表</a></p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>相关服务推荐</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;"><article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="${SITE}/services">小程序开发服务</a></h3><p>专业微信小程序定制开发，电商、教育、医疗等行业解决方案。</p><p><a href="${SITE}/contact">获取报价 →</a></p></article><article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="${SITE}/services">APP定制开发</a></h3><p>原生iOS/Android和Flutter跨平台开发，高性能体验优秀。</p><p><a href="${SITE}/contact">获取报价 →</a></p></article><article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="${SITE}/services">企业网站建设</a></h3><p>高端定制企业官网、SaaS平台，Vue3+Node.js全栈开发。</p><p><a href="${SITE}/contact">获取报价 →</a></p></article></div></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>文章问答</h2><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">
<h3>这篇文章的核心观点是什么？</h3><p>${esc(trunc(a.summary, 100))}</p>
<h3>如何获取更多技术方案？</h3><p>您可以访问<a href="${SITE}/services">服务页面</a>了解我们的技术能力，或<a href="${SITE}/contact">联系我们</a>获取专属方案。</p>
</div></section>
${casesHtml}
${solutionsHtml}
${relatedHtml}
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"${esc(a.title)}的核心观点是什么？","acceptedAnswer":{"@type":"Answer","text":"${esc(trunc(a.summary, 160))}"}},{"@type":"Question","name":"如何获取更多技术方案？","acceptedAnswer":{"@type":"Answer","text":"访问汇智云码科技服务页面或联系获取专属方案。"}}]}</script>`;
}

function aboutBody(info) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;margin-bottom:28px;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>关于汇智云码科技 - 青岛软件开发公司</h1><p>核心团队来自腾讯、阿里、字节，专注企业数字化 8 年，120+ 企业客户的长期技术伙伴。</p></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>公司简介</h2>
${info && info.company_intro ? '<div>' + info.company_intro + '</div>' : ''}
<p>汇智云码科技（青岛）成立于 2018 年，是一家专注企业数字化转型的技术服务公司。我们为中小企业提供<strong>小程序开发、APP 定制开发、企业网站建设、SaaS 系统开发</strong>四大主线服务，业务覆盖餐饮、零售、教育、医疗、房产、汽车、旅游、物流、制造等 14 个行业。</p>
<p>与"接单转包"的外包公司不同，汇智云码坚持<strong>自有技术团队直营交付</strong>：需求分析、UI 设计、前后端开发、测试上线、售后运维全部由公司正式员工完成，杜绝层层转包导致的质量衰减与进度失控。截至目前，公司累计交付项目 120 余个，客户续约与转介绍比例超过 60%。</p>
<p>公司总部位于山东青岛，服务范围覆盖全国，支持远程协作与驻场开发两种合作模式。所有项目一律<strong>源码交付</strong>，客户拥有完整知识产权，不受任何形式的技术绑架。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>团队构成</h2>
<p>公司现有技术与设计人员 26 人，按职能划分为四个小组，各司其职、流水线协作：</p>
<h3 ${H3}>产品与需求组（4 人）</h3>
<p>负责与客户沟通业务逻辑、梳理需求文档、输出原型图与流程图。成员具备行业业务背景，能够在客户尚未想清楚需求时给出可落地的建议，避免"开发到一半才发现方向错了"。</p>
<h3 ${H3}>UI/UX 设计组（5 人）</h3>
<p>负责界面视觉设计与交互设计，输出完整设计稿与切图规范。所有设计稿均基于真实业务流程设计，而非套用模板，兼顾美观与操作效率。</p>
<h3 ${H3}>研发组（12 人）</h3>
<p>分前端与后端两个小队。前端覆盖微信小程序原生、uni-app、Vue3、React Native、Flutter；后端覆盖 Java Spring Boot、Node.js、Python Django/FastAPI、PHP，数据库涵盖 MySQL、PostgreSQL、Redis、MongoDB。核心成员来自腾讯、阿里、字节跳动，平均从业年限 7 年。</p>
<h3 ${H3}>测试与运维组（5 人）</h3>
<p>负责功能测试、性能压测、上线部署与后续运维。服务器部署支持腾讯云、阿里云、华为云及客户自有服务器，提供 7×12 小时响应支持。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>我们的服务理念</h2>
<h3 ${H3}>一、需求先行，不做无效开发</h3>
<p>很多企业数字化项目失败的根本原因不是技术不行，而是需求没想清楚。汇智云码在正式报价前会先做一轮免费需求梳理，把客户口中的"我要一个商城"拆解成具体的功能清单、角色权限、业务流程，形成书面文档双方确认后再动手。这一步通常需要 2-3 次沟通，但它能省掉后期数倍于沟通成本的返工。</p>
<h3 ${H3}>二、明码标价，拒绝隐形消费</h3>
<p>公司所有标准化套餐均在小程序开发、APP 开发、网站建设三大类目下明码标价并在线公示，客户可以直接在官网查看功能配置与对应价格。定制项目在需求确认后出具详细报价单，列明每一项功能的开发工时与费用，签约后不加价（需求变更除外）。</p>
<h3 ${H3}>三、源码交付，客户资产归客户</h3>
<p>项目验收后，我们交付完整源代码、数据库脚本、部署文档与操作手册。客户既可以选择继续由我们维护，也可以自行组建团队接手，或交由第三方维护，我们不做任何技术锁定。</p>
<h3 ${H3}>四、终身维护，不设维护期限</h3>
<p>所有交付项目提供终身免费的技术咨询与 Bug 修复。服务器迁移、小程序版本更新导致的兼容性问题，我们无条件协助处理。功能迭代与新增需求按人天计费，老客户享受折扣。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>标准服务流程</h2>
<p>从初次接触到项目上线，标准流程分为六步，每个节点都有明确的交付物：</p>
<p><strong>第一步 · 需求沟通（1-3 个工作日）</strong><br>通过电话、微信或面谈了解业务背景与核心诉求，输出《需求梳理纪要》。此阶段完全免费，不收取任何费用。</p>
<p><strong>第二步 · 方案与报价（1-2 个工作日）</strong><br>基于需求纪要输出功能清单、技术选型建议、开发周期与报价单。客户可对方案提出修改意见，直至确认。</p>
<p><strong>第三步 · 原型与设计（3-7 个工作日）</strong><br>输出页面原型图与 UI 设计稿，客户确认后进入开发。设计阶段通常提供 2-3 轮修改机会。</p>
<p><strong>第四步 · 开发实现（按复杂度，通常 15-60 个工作日）</strong><br>前后端并行开发，每周同步一次进度，客户可随时查看测试环境效果，及时提出调整意见。</p>
<p><strong>第五步 · 测试与验收（3-7 个工作日）</strong><br>功能测试、兼容性测试、压力测试后提交客户验收。验收通过即交付源码与文档。</p>
<p><strong>第六步 · 上线与运维（长期）</strong><br>协助完成服务器部署、域名备案、小程序提审等上架流程，并提供后续技术支持。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>为什么选择汇智云码</h2>
<p><strong>行业经验足：</strong>服务过 14 个行业的 120+ 企业客户，对餐饮、零售、教育、医疗等行业的业务流程有现成认知，能够大幅缩短需求沟通成本。</p>
<p><strong>技术栈新：</strong>全部项目基于当前主流技术栈开发，不使用过时框架，确保项目在 3-5 年内仍具备可维护性与扩展性。</p>
<p><strong>价格透明：</strong>标准化套餐官网明码标价，定制项目报价单逐项列明，不存在"低价签约、中途加价"的行业陋习。</p>
<p><strong>响应及时：</strong>项目期内建立专属沟通群，工作日 2 小时内响应；售后问题 24 小时内给出处理方案。</p>
<p><strong>源码交付：</strong>交付物包含完整源码、数据库、部署文档，客户完全掌控自己的数字化资产。</p>
<p style="margin-top:24px;text-align:center;"><a href="${SITE}/cases" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看客户案例</a><a href="${SITE}/contact" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">联系我们</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;text-align:center;">相关页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/templates">网站模板商城</a></p>
</div>
</section>`;
}

function templatesBody(templates) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业网站模板商城</h1><p>精选企业级网站模板，购买后源码交付，支持二次开发。含在线演示。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;"><h2 ${H2}>模板列表</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${templates.map(t => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;">${(t.demo_url || '').match(/\/([a-z]+)\/?$/) ? `<img class="card-img" style="width:100%;height:auto;border-radius:8px;margin-bottom:16px;display:block;" src="${SITE}/seo/images/templates/${t.demo_url.replace(/\/$/, '').split('/').pop()}.jpg" alt="${esc(t.name)}_网站模板截图" loading="lazy" width="800" height="450">` : ''}<h3><a href="${SITE}/templates">${esc(t.name)}</a></h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">价格：<strong>¥${Number(t.price).toFixed(0)}</strong></p><p>${esc(t.description || '')}</p>${t.demo_url ? `<p><a href="${esc(t.demo_url)}" rel="nofollow">在线演示</a></p>` : ''}</article>`).join('\n')}
</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>关于网站模板，你需要知道的几件事</h2>
<p>很多客户在咨询时第一句话是"你们有没有现成模板，便宜点的"。坦诚说，<strong>模板和定制是两种完全不同的产品</strong>，适用的场景也不一样。这里把区别讲清楚，方便你做决策。</p>

<h3 ${H3}>一、模板适合什么场景？</h3>
<p>如果你的需求是"先有个能对外展示的官方网站"——展示公司简介、产品服务、联系方式、新闻动态，不需要复杂的会员体系、在线交易、后台审批流程，那么模板是性价比最高的选择。我们的模板均为完整可运行的前后端代码，不是只给设计稿或静态 HTML，购买后即可部署上线，通常 1-3 个工作日就能完成。</p>
<p>模板特别适合：初创公司刚起步阶段需要一个官网撑门面；企业已有主站，需要为某个产品线或活动做一个独立的展示站；预算有限但希望视觉上不输同行。</p>

<h3 ${H3}>二、模板不适合什么场景？</h3>
<p>如果业务涉及以下任一项，模板会很快成为瓶颈，建议直接考虑定制开发：</p>
<p><strong>复杂的业务流程</strong>——比如需要多角色权限（客户、员工、管理员各自看到不同内容）、审批流转、订单状态机。模板的权限体系通常只有"管理员/普通用户"两级，改造成本可能高于重写。</p>
<p><strong>在线交易与支付</strong>——涉及购物车、优惠券、库存扣减、支付回调、退款流程的电商类需求。模板可能带简单商城功能，但缺乏针对具体业务场景的营销玩法（拼团、秒杀、分销），后期扩展会非常别扭。</p>
<p><strong>与现有系统对接</strong>——需要对接企业已有的 ERP、CRM、OA 系统，或调用第三方 API 做数据同步。这类需求需要针对性的接口开发，模板无法直接支持。</p>
<p><strong>强品牌调性要求</strong>——品牌视觉规范严格，需要高度定制的交互动效与页面结构。模板的视觉框架是固定的，强行改造往往"四不像"，不如从零设计。</p>

<h3 ${H3}>三、模板购买后的交付内容</h3>
<p>每套模板交付物包含：</p>
<p>· 完整前端源码（含所有页面与组件）<br>· 完整后端源码与数据库结构文件<br>· 部署文档（含环境要求、部署步骤、常见问题）<br>· 后台管理系统的账号与使用说明<br>· 30 天内的免费技术支持（协助部署、答疑）</p>
<p>我们不提供"加密源码"或"授权码绑定域名"这类做法——交付即完整交付，你拿到的是可以任意修改、任意部署的完整代码。</p>

<h3 ${H3}>四、模板能升级为定制吗？</h3>
<p>可以。常见的过渡方式是：先用模板上线抢占时间窗口，业务验证跑通后再基于原模板做二次开发，逐步替换核心模块。这样做的好处是前期投入小、上线快，风险可控。我们会在二次开发前做一次代码评估，给出"在模板上改"与"重写"的成本对比，由你选择更划算的方案。</p>

<h3 ${H3}>五、购买前建议先做什么？</h3>
<p>建议先看在线演示，把每个页面的交互点一遍，确认结构符合你的业务逻辑。如果演示看了还是拿不准，可以直接联系我们说明业务场景，我们会告诉你这套模板是否合适——如果确实不合适，我们会直接建议你做定制，而不是硬推模板给你。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;">
<div class="content" ${S} style="text-align:center;">
<h2 ${H2}>没找到合适的模板？</h2>
<p>告诉我们你的行业与功能需求，我们可以为你定制开发，或者推荐最接近的模板加改造方案。</p>
<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">咨询模板或定制方案</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/solutions">行业解决方案</a></p>
</div>
</section>`;
}

function packagesBody(packages) {
  if (!packages || packages.length === 0) return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>软件开发套餐</h1><p>网站建设、小程序、APP标准化开发套餐，明码标价，在线直接下单。</p></section>`;
  const bizMap = { website: '网站建设', miniapp: '小程序', app: 'APP开发' };
  const group = {};
  for (const p of packages) {
    (group[bizMap[p.biz_type] || p.biz_type] = group[bizMap[p.biz_type] || p.biz_type] || []).push(p);
  }
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>软件开发套餐 · 明码标价</h1><p>按行业标准化配置，明码标价，在线直接选择下单，源码交付。</p><p><a href="${SITE}/packages">➤ 在线选配套餐并下单</a></p></section>
${Object.entries(group).map(([type, list]) => `<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2 class="seo-type">${type}开发套餐</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${list.map(p => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>${esc(p.name)}（${esc(p.industry)}）</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">明码标价：<strong>¥${Number(p.price).toFixed(0)}</strong> <s>¥${Number(p.original_price).toFixed(0)}</s></p><p>${esc((p.features || '').split('|').slice(0, 4).join('、'))}</p><p><a href="${SITE}/packages">在线下单</a></p></article>`).join('\n')}
</div></section>`).join('\n')}`;
}

function contactBody(info) {
  // 兼容 company_ 前缀（数据库实际 key）与无前缀两种
  const phone = info && (info.company_phone || info.phone) ? esc(info.company_phone || info.phone) : '';
  const wechat = info && (info.company_wechat || info.wechat) ? esc(info.company_wechat || info.wechat) : '';
  const address = info && (info.company_address || info.address) ? esc(info.company_address || info.address) : '山东青岛';
  const email = info && (info.company_email || info.email) ? esc(info.company_email || info.email) : '';
  const cMobile = getMobile(info);
  const cMask = cMobile ? esc(maskMobile(cMobile)) : '';
  const cData = cMobile ? (cMobile.slice(0,3)+'-'+cMobile.slice(3,7)+'-'+cMobile.slice(7)) : '';
  const mobileLinkHtml = cMobile ? '<p class="contact-row" style="margin-bottom:16px;font-size:16px;">📱 手机/微信同号（点击拨打）：<a href="#" data-tel="'+cData+'" class="js-tel" style="font-size:20px;font-weight:bold;color:#1d4ed8;">'+cMask+'</a></p>' : '';
  const mobileJs = cMobile ? '<script>(function(){var a=document.querySelector(".js-tel");if(a){a.addEventListener("click",function(e){e.preventDefault();location.href="tel:"+this.getAttribute("data-tel").replace(/\D/g,"");});}})();<'+'/script>' : '';
  const mobileHtml = mobileLinkHtml + mobileJs;
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>联系我们</h1><p>获取企业网站建设、小程序开发、APP定制开发方案与报价。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">
${mobileHtml}
${phone ? `<p class="contact-row" style="margin-bottom:16px;font-size:16px;">📞 QQ咨询：<a href="tel:${phone}" style="font-size:20px;font-weight:bold;color:#1d4ed8;">${phone}</a>（点击直接拨打）</p>` : ''}
${wechat && wechat !== '扫二维码' ? `<p class="contact-row" style="margin-bottom:16px;font-size:16px;">💬 微信：${wechat}（添加请备注"网站咨询"）</p>` : ''}
${email ? `<p class="contact-row" style="margin-bottom:16px;font-size:16px;">📧 邮箱：<a href="mailto:${email}">${email}</a></p>` : ''}
<p class="contact-row" style="margin-bottom:16px;font-size:16px;">📍 地址：${address}（支持远程合作）</p>
<p class="contact-row" style="margin-bottom:16px;font-size:16px;">🖼️ 微信扫码咨询：<br><img src="${SITE}/uploads/wechat_qr.png" alt="汇智云码科技微信二维码_扫码咨询小程序开发APP开发报价" style="width:160px;height:160px;border-radius:8px;margin-top:8px;"></p>
<div style="margin-top:24px;padding:20px;background:#f0f7ff;border-radius:12px;text-align:center;">
<p style="font-size:18px;font-weight:bold;color:#1e3a8a;">👉 想获取专属方案与报价？</p>
<p>免费需求梳理 · 透明报价 · 24小时响应</p>
<p style="margin-top:12px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">立即在线留言咨询</a></p>
</div>
<p style="margin-top:16px;">我们提供：需求梳理免费，方案报价透明，快速响应。</p>
</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">咨询流程与响应时效</h2>
<p>为了让你在最短时间内拿到可执行的方案与报价，我们的咨询流程分成三个环节，每个环节都有明确的时效承诺：</p>
<p><strong>第一环节 · 初步沟通（2 小时内响应）</strong><br>你通过电话、微信或在线留言说明大致需求。我们不会一上来就报一个笼统的"XX 元起"，而是先问清楚几件事：业务场景是什么、目标用户是谁、需要哪些核心功能、是否有上线时间要求、预算区间大概多少。这些信息直接影响技术选型与工时估算，问清楚比报价快更重要。</p>
<p><strong>第二环节 · 需求梳理与方案（1-2 个工作日）</strong><br>基于初步沟通的结果，我们输出一份简明的功能清单与技术选型建议，包含开发周期预估与报价区间。这份材料完全免费，不收取任何前期费用，也不要求你先签约。</p>
<p><strong>第三环节 · 详细评估与签约（按需）</strong><br>如果你认可方案方向，我们会安排项目经理做一轮更细致的需求确认，输出正式的功能文档与报价单，双方确认后签约启动。从签约到项目启动通常不超过 3 个工作日。</p>
<p>需要说明的是：如果你的需求和我们的能力范围不匹配（比如需要的是硬件嵌入式开发、或者是纯设计外包），我们会直接说明并尽量帮你推荐合适的团队，不会勉强接单。把不擅长的活接下来再转手，对双方都是浪费。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">咨询前可以先准备这些信息</h2>
<p>如果你能在咨询前把下面几项信息大致想清楚，沟通效率会高很多（想不清楚也没关系，我们会在沟通中帮你梳理）：</p>
<p>· <strong>行业与业务：</strong>公司做什么业务，这次数字化想解决什么具体问题<br>· <strong>目标用户：</strong>系统面向谁使用——终端消费者、公司员工、还是渠道商<br>· <strong>核心功能：</strong>最关键的 3-5 个功能点是什么，哪些是必需、哪些是加分项<br>· <strong>参考产品：</strong>有没有见过的类似产品，喜欢它哪里、不喜欢它哪里<br>· <strong>上线时间：</strong>有没有硬性时间节点（比如配合某个活动或展会）<br>· <strong>预算区间：</strong>大致范围即可，有助于我们推荐合适的技术方案</p>
<p>不用准备得面面俱到。实际经验中，客户最初描述的需求和最终实现的功能往往有 30%-50% 的差异，这很正常——需求梳理的目的就是把这个差异在写代码之前暴露出来。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">常见咨询问题</h2>
<p><strong>问：必须先签约才能报价吗？</strong><br>不需要。需求梳理和方案报价都是免费的，你可以在拿到完整方案和报价后再决定是否合作。</p>
<p><strong>问：外地客户怎么签合同？</strong><br>支持电子合同，通过微信或邮箱发送，线上签署即时生效。公司 60% 以上客户来自山东省外，远程合作流程已经很成熟。</p>
<p><strong>问：可以先做一份小样试试吗？</strong><br>可以。对于较大的项目，我们支持先做核心模块或原型演示，你确认效果满意后再签整体项目。这样能降低双方的风险。</p>
<p><strong>问：报价包含服务器和域名费用吗？</strong><br>不包含。开发费用只涵盖软件开发本身。服务器、域名、SSL 证书、短信服务、地图 API 等第三方资源费用需按年支付给相应服务商，我们可代购也可由你自行购买。一般中小型项目的服务器年费在 500-3000 元之间。</p>
<p><strong>问：项目上线后你们还管吗？</strong><br>管。验收后提供 3-12 个月免费维护期，之后可签年度维护协议或按次付费。所有项目提供终身免费的技术咨询与 Bug 修复。</p>
<p><strong>问：微信咨询多久回复？</strong><br>工作日通常 2 小时内回复，非工作时间可能延迟到次日。如果需求较急，建议直接电话联系。</p>
<p style="margin-top:20px;padding-top:18px;border-top:1px dashed #cbd5e1;">咨询前可以先看看这些页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/about">公司团队</a></p>
</div>
</section>`;
}

// ---------- sitemap 生成 ----------
function buildSitemap(urls) {
  const now = new Date().toISOString().slice(0, 10);
  const items = [...new Set(urls)].map(u => {
    const url = u.startsWith('http') ? u : `${SITE}${u}`;
    // 按页面类型区分权重：首页 1.0 > 栏目页 0.8 > 详情页 0.6
    var path = url.replace(/^https?:\/\/[^/]+/, '');
    var pri = '0.6', freq = 'monthly';
    if (path === '/' || path === '') { pri = '1.0'; freq = 'daily'; }
    else if (/^\/(services|cases|articles|packages|templates|solutions)\/?$/.test(path)) { pri = '0.9'; freq = 'weekly'; }
    else if (/^\/(about|contact)\/?$/.test(path)) { pri = '0.7'; freq = 'monthly'; }
    return `  <url>\n    <loc>${esc(url)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
}

// ---------- 文章封面图 ----------
// 【SEO 修复】为每篇文章生成 1200x630 封面（深色渐变 + 中文标题），
// 同时供文章页 <img> 与 Article 结构化数据 image 字段使用，替代 404 的 placeholder.jpg
const ARTICLES_IMG_DIR = path.join(DIST, 'seo', 'images', 'articles');
function ensureArticleImages(articles) {
  fs.mkdirSync(ARTICLES_IMG_DIR, { recursive: true });
  let generated = 0;
  for (const a of articles) {
    const file = path.join(ARTICLES_IMG_DIR, `${a.id}.jpg`);
    if (fs.existsSync(file)) continue;
    const title = trunc(a.title, 22) || '汇智云码技术资讯';
    const cat = trunc(a.category || '行业洞察', 14);
    const cmd = [
      'convert',
      '-size', '1200x630',
      "gradient:'#0f172a'-'#1e3a8a'",
      '-font', shq(CASE_COVER_FONT),
      '-fill', 'white',
      '-gravity', 'center',
      '-pointsize', '46',
      '-annotate', '+0-10', shq(title),
      '-fill', "'#93c5fd'",
      '-gravity', 'south',
      '-pointsize', '26',
      '-annotate', '+0+60', shq(cat + ' · 汇智云码科技'),
      shq(file),
    ].join(' ');
    try {
      execSync(cmd, { stdio: 'ignore' });
      generated += 1;
    } catch (e) {
      console.error(`   ⚠️ 文章封面生成失败 seo/images/articles/${a.id}.jpg: ${e.message}`);
    }
  }
  if (generated > 0) console.log(`   - 本次新增文章封面 ${generated} 张`);
}

// ---------- 案例封面占位图 ----------
// 确保每个案例都有 800x450 封面：深色渐变背景 + 白色中文标题（过长截断）+ 底部行业类别小字。
// 首页、cases 栏目页、case 详情页共用该封面，生成前调用补齐缺失图片。
function ensureCaseImages(cases) {
  fs.mkdirSync(CASES_IMG_DIR, { recursive: true });
  let generated = 0;
  for (const c of cases) {
    const file = path.join(CASES_IMG_DIR, `${c.id}.jpg`);
    if (fs.existsSync(file)) continue;
    const title = trunc(c.title, 16) || '案例展示';
    const category = trunc(c.category || '行业案例', 14);
    const cmd = [
      'convert',
      '-size', '800x450',
      "gradient:'#111827'-'#1e3a8a'",
      '-font', shq(CASE_COVER_FONT),
      '-fill', 'white',
      '-gravity', 'center',
      '-pointsize', '38',
      '-annotate', '+0-10', shq(title),
      '-fill', "'#94a3b8'",
      '-gravity', 'south',
      '-pointsize', '22',
      '-annotate', '+0+30', shq(category),
      shq(file),
    ].join(' ');
    try {
      execSync(cmd, { stdio: 'ignore' });
      generated += 1;
      console.log(`   - 生成案例封面: seo/images/cases/${c.id}.jpg`);
    } catch (e) {
      console.error(`   ⚠️ 案例封面生成失败 seo/images/cases/${c.id}.jpg: ${e.message}`);
    }
  }
  if (generated > 0) console.log(`   - 本次新增案例封面 ${generated} 张`);
}

// ---------- 可索引城市白名单 ----------
// 【SEO 修复】城市站群止险：只有白名单内城市允许搜索引擎索引，
// 其余城市站（含其他 15 个重点城市）一律 noindex 兜底，避免批量近似内容被判站群。
// 调整方式：编辑同目录 city-whitelist.json 后重跑 node generate.js，无需改代码。
var CITY_INDEX_WHITELIST = (function () {
  try {
    var p = path.join(__dirname, 'city-whitelist.json');
    if (fs.existsSync(p)) {
      var arr = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) { console.error('  ⚠️ 读取 city-whitelist.json 失败，使用默认白名单', e.message); }
  return ['qingdao', 'jinan', 'yantai', 'weifang', 'linyi'];
})();
function isIndexableCity(sd) { return CITY_INDEX_WHITELIST.indexOf(sd) >= 0; }
// 只有真实办公地的城市才输出 LocalBusiness，避免给无实体地址的城市伪造本地商家信息
var OFFICE_CITIES = ['qingdao'];
function cityServiceJsonLd(subdomain, cityName, provName, description) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: cityName + '小程序开发与APP定制服务',
    serviceType: '小程序开发/APP定制开发/企业网站建设',
    provider: { '@type': 'Organization', name: '汇智云码科技', url: SITE + '/' },
    areaServed: { '@type': 'City', name: cityName, containedInPlace: { '@type': 'AdministrativeArea', name: provName } },
    url: 'https://' + subdomain + '.openai2000.cn/',
    description: trunc(description, 200)
  }) + '</' + 'script>';
}

// ---------- 主流程 ----------
// ---------- City SEO Pages ----------
// ===== 重点城市差异化（20城），避免批量薄内容判定 =====
var PRIORITY_CITIES = {
  qingdao:{hq:true,inds:['外贸与海洋经济','零售连锁','餐饮','智能制造']},
  jinan:{inds:['政务与国企数字化','教育','医疗','装备制造']},
  yantai:{inds:['海洋食品','葡萄酒文旅','装备制造','跨境电商']},
  weifang:{inds:['现代农业装备','动力装备','蔬菜批发电商','文旅']},
  linyi:{inds:['商贸物流批发','建材家居','板材产业','直播电商']},
  beijing:{inds:['互联网与SaaS','金融科技','教育','医疗健康']},
  shanghai:{inds:['金融贸易','跨境电商','汽车与高端制造','连锁服务']},
  guangzhou:{inds:['服装批发电商','美妆日化','餐饮连锁','会展商贸']},
  shenzhen:{inds:['智能硬件','跨境电商','SaaS与企业服务','金融科技']},
  hangzhou:{inds:['直播电商','SaaS','服装零售','文旅']},
  chengdu:{inds:['餐饮连锁','游戏娱乐','文旅','消费零售']},
  nanjing:{inds:['软件与信息服务','教育','医疗','智能制造']},
  wuhan:{inds:['光电子信息','汽车零部件','教育','医疗']},
  xian:{inds:['能源装备','文旅','军工配套','教育']},
  suzhou:{inds:['电子制造','工业互联网','医疗器械','跨境电商']},
  tianjin:{inds:['港口贸易','化工','装备制造','零售连锁']},
  chongqing:{inds:['汽车制造','餐饮','装备制造','文旅']},
  zhengzhou:{inds:['食品加工','商贸物流','装备制造','教育']},
  changsha:{inds:['工程机械','文娱传媒','餐饮连锁','消费电子']},
  ningbo:{inds:['外贸出口','模具与文具','跨境电商','港口物流']}
};
var INDUSTRY_KW = {
  '外贸与海洋经济':['外贸','海洋','跨境','出口'],'跨境电商':['电商','商城','购物','零售'],
  '直播电商':['电商','直播','商城'],'服装批发电商':['电商','服装','商城'],'服装零售':['服装','电商','零售'],
  '零售连锁':['零售','连锁','会员','门店','扫码购'],'餐饮':['餐饮','点餐','外卖','奶茶'],
  '餐饮连锁':['餐饮','点餐','外卖'],'智能制造':['制造','工业','设备','管理系统'],
  '工业互联网':['工业','制造','设备','管理'],'智能硬件':['硬件','IoT','物联网','设备'],
  '教育':['教育','培训','K12','课程','招生'],'医疗':['医疗','医院','门诊','问诊','挂号'],
  '医疗健康':['医疗','医院','门诊','问诊'],'医疗器械':['医疗','器械','健康'],
  '文旅':['文旅','旅游','门票','酒店'],'商贸物流批发':['物流','批发','商城','供应链'],
  '商贸物流':['物流','商贸','供应链'],'政务与国企数字化':['政务','管理系统','OA','审批'],
  '金融科技':['金融','支付','理财'],'金融贸易':['金融','贸易','支付'],
  'SaaS与企业服务':['SaaS','管理系统','CRM','OA'],'软件与信息服务':['管理系统','SaaS','OA','CRM'],
  'SaaS':['SaaS','管理系统','CRM'],'互联网与SaaS':['SaaS','互联网','管理系统'],
  '汽车与高端制造':['汽车','制造','配件'],'汽车制造':['汽车','制造'],'汽车零部件':['汽车','配件','制造'],
  '电子制造':['电子','制造','设备'],'装备制造':['装备','制造','机械'],'工程机械':['机械','装备','制造'],
  '动力装备':['制造','装备','机械'],'现代农业装备':['农业','装备','电商'],'蔬菜批发电商':['电商','批发','生鲜'],
  '海洋食品':['食品','电商','供应链'],'葡萄酒文旅':['文旅','电商','零售'],'港口贸易':['港口','物流','外贸'],
  '港口物流':['港口','物流','货运'],'外贸出口':['外贸','跨境','出口'],'模具与文具':['制造','模具','批发'],
  '能源装备':['能源','装备','制造'],'军工配套':['制造','装备','管理'],'光电子信息':['电子','制造','管理系统'],
  '化工':['化工','制造','管理'],'游戏娱乐':['游戏','娱乐','社交'],'文娱传媒':['传媒','内容','娱乐'],
  '消费电子':['电子','商城','零售'],'消费零售':['零售','商城','会员'],'会展商贸':['会展','商贸','管理'],
  '美妆日化':['美妆','电商','商城'],'连锁服务':['连锁','会员','门店'],'食品加工':['食品','餐饮','供应链'],
  '建材家居':['建材','家居','装修'],'板材产业':['建材','家居','批发']
};
function pickLocalCases(allCases, inds, limit) {
  var pool = [];
  inds.forEach(function(ind){ (INDUSTRY_KW[ind]||[]).forEach(function(kw){ allCases.forEach(function(c){ var hay=(c.category||'')+(c.title||''); if (hay.indexOf(kw)>=0 && pool.indexOf(c)<0) pool.push(c); }); }); });
  if (pool.length === 0) pool = allCases.slice();
  return pool.slice(0, limit || 6);
}
// ===== 白名单城市深度本地化内容（逐城独立撰写，不共用模板）=====
var CITY_DEEP = {
  qingdao: {
    h2: '青岛本地开发服务说明',
    paras: [
      '<p>汇智云码科技总部设在青岛胶州，办公地址为东关大街 8 号中央公园写字楼 11 楼，产品、设计、开发、测试团队均常驻青岛，不是接单后转包给外地团队的模式。青岛市区及胶州、黄岛（西海岸）、城阳、即墨、平度、莱西的客户，既可以直接到公司面谈，也可以约我们上门做需求调研。</p>',
      '<p>青岛本地客户的服务路径和外地客户不太一样：需求阶段可约上门沟通，开发过程中可以安排工程师到贵公司驻场对接，验收阶段可以现场演示逐项确认。合同支持当面签署，付款按里程碑走，交付物包括全部源代码、数据库结构、部署文档和操作手册。</p>',
      '<p>我们服务青岛客户的方式建立在本地团队基础上——遇到需要紧急处理的问题，可以当天到现场；需要和你的业务人员反复对齐的环节，不需要靠视频会议来回猜。</p>'
    ],
    indsTitle: '青岛本地企业的数字化需求，我们主要覆盖这几个方向',
    inds: [
      {n: '外贸与跨境电商', d: '青岛港和上合示范区带动了大量外贸企业。这类企业需要的通常不是展示型官网，而是能对接多平台订单、支持多语言多币种、能和报关物流信息打通的独立站或订单管理系统。'},
      {n: '家电与智能制造配套', d: '海尔、海信等龙头在青岛带动了庞大的供应链体系。配套供应商企业普遍需要产品选型展示、订单协同、质检追踪这类偏工业场景的系统，对数据准确性和多角色权限要求较高。'},
      {n: '餐饮与零售连锁', d: '青岛本地餐饮和连锁零售竞争激烈。扫码点餐、会员储值、线上商城是常见需求，核心诉求是缩短点单路径、降低服务员人力依赖、把复购做起来。'},
      {n: '海洋经济与港口物流', d: '涉及货运代理、仓储管理、集装箱调度等场景。这类系统对数据实时性和第三方系统对接能力要求高，通常需要和客户现有 ERP 或船公司系统做接口。'}
    ],
    faqTitle: '青岛客户常见问题',
    faq: [
      {q: '青岛本地可以上门面谈吗？', a: '可以。我们总部就在青岛胶州，青岛全域及周边县市都可以预约上门沟通、现场需求调研和阶段性验收，不额外收取上门费用。'},
      {q: '青岛有常驻的开发团队吗？', a: '有。产品、设计、前后端开发和测试都在青岛办公，不采用接单后转包的模式。项目沟通可以直接找到负责你这个项目的工程师，不需要通过中间层转达。'},
      {q: '外贸行业你们做过哪些类型的系统？', a: '主要做过跨境电商独立站、多平台订单归集系统、供应商协同平台和报关资料管理系统。这类项目的难点通常不在页面本身，而在多平台接口对接、多币种结算和报关物流数据的准确性。'},
      {q: '上门调研需要收费吗？', a: '不收费。需求梳理、流程调研和初步方案报价都是免费的，不签约也没有关系。很多客户最初描述的需求和最终实现的功能会有较大差异，在动手写代码前把这些理清楚，能省下大量返工成本。'},
      {q: '在青岛做一个餐饮小程序大概多少钱、多久？', a: '扫码点餐加会员储值这类标准功能组合，通常数千元到两万元区间；如果需要对接外卖平台、做多门店库存和供应链协同，投入会相应增加。周期上，标准功能一般 3-5 周，复杂一些的 6-8 周。具体报价在需求确认后书面给出。'}
    ]
  },
  jinan: {
    h2: '济南本地开发服务说明',
    paras: [
      '<p>面向济南客户，汇智云码科技采用「远程协作 + 关键节点驻场」的服务模式。济南到青岛高铁 1.5 至 2 小时，日常需求沟通、原型评审、进度同步通过视频会议和项目管理工具完成，效率不受地域影响；立项、原型确认、上线验收等关键节点可以安排同事到济南现场支持。</p>',
      '<p>合同、发票、售后标准与青岛总部完全一致，济南客户对公打款后开具增值税发票，按里程碑付款。需要现场配合的环节（例如系统演示、业务人员集中培训、上线保障）我们提前安排行程，不额外收取差旅费用。</p>',
      '<p>需要说明的是，济南客户的合规敏感度普遍高于其他地区——这一点我们在方案阶段就会纳入考虑，而不是等验收时才补材料。</p>'
    ],
    indsTitle: '济南本地企业的数字化需求，我们主要覆盖这几个方向',
    inds: [
      {n: '政务与国企信息化', d: '济南是山东省会，省属国企、事业单位和政府信息化项目集中。这类项目除了功能本身，还关注等保合规、信创环境适配、数据不出省、招投标资质和验收材料齐全度，需要在方案阶段就一并设计，后期补做代价很高。'},
      {n: '软件与信息服务', d: '齐鲁软件园聚集了大量软件企业。这类客户往往有自己的技术团队，需求集中在补足特定技术方向的产能缺口、承接阶段性模块开发，或者做技术栈升级改造。'},
      {n: '教育与医疗', d: '山东高校和医疗机构数量多，招生报名、教务管理、预约挂号、患者随访管理等系统需求稳定。这类系统对并发承载、数据权限分级和流程严谨性要求较高。'},
      {n: '装备制造与汽车零部件', d: '中国重汽等企业带动了装备制造和零部件配套产业，需要生产管理、设备维保、供应链协同类系统，通常要和企业既有的生产或财务系统做数据对接。'}
    ],
    faqTitle: '济南客户常见问题',
    faq: [
      {q: '济南的项目怎么协作？需要你们常驻吗？', a: '采用「远程协作 + 关键节点驻场」模式，不需要全程常驻。日常通过视频会议和项目管理工具同步，立项、原型确认、上线验收等关键节点安排同事到济南现场。如果项目本身要求驻场开发（部分国企项目会有此要求），可以在合同中约定驻场周期。'},
      {q: '国企或政府采购类项目，你们能配合走招投标流程吗？', a: '可以配合。我们能提供技术方案书、需求响应表、项目业绩证明、企业资质材料等投标所需文件。需要注意的是，投标主体资格和具体资质要求需要按项目招标文件逐项核对，部分资质我们可能不具备，会在评估后如实告知，不会为了接项目做虚假承诺。'},
      {q: '等保和信创的要求能支持吗？', a: '可以支持到应用层。我们能按等保二级/三级要求做应用侧的安全设计（身份鉴别、访问控制、安全审计、数据加密存储、接口防重放等），并配合提供测评所需的技术文档；信创方面可适配国产化操作系统、数据库和中间件的应用层兼容。但等保测评的通过结论由具备资质的测评机构出具，我们负责配合整改，不能代替测评机构做承诺。'},
      {q: '济南做一个小程序或管理系统大概多少钱？', a: '展示型小程序数千元起，带交易或预约功能的一般 1 至 3 万元；管理系统按模块计价，通常 3 万元起步，涉及多系统对接和复杂权限的会更高。政务类项目因为合规和文档要求更多，工作量评估会比同等功能的商业项目高，具体在需求确认后出具书面报价。'},
      {q: '交付物具体包含哪些？', a: '包含全部源代码（前端、后端）、数据库结构与初始化脚本、部署文档、操作手册、接口文档。如果需要，还可以提供源代码审计材料、信创环境适配说明和等保测评配合文档。源代码所有权归客户，不存在只给账号不给源码的托管模式。'}
    ]
  }
};
function cityDeepBlock(sd, cn, pn) {
  var d = CITY_DEEP[sd];
  if (!d) return '';
  var h = '';
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + d.h2 + '</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">';
  h += d.paras.join('\n');
  if (d.inds && d.inds.length) {
    h += '<h3 style="font-size:19px;color:#1e3a8a;margin:28px 0 14px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">' + d.indsTitle + '</h3>';
    d.inds.forEach(function(it) {
      h += '<p style="margin:0 0 16px;"><strong style="color:#1e293b;">' + it.n + '</strong><br>' + it.d + '</p>';
    });
  }
  h += '</div></section>';
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 60px;"><h2>' + d.faqTitle + '</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 32px 24px;line-height:1.9;">';
  d.faq.forEach(function(f) {
    h += '<h3 style="margin:22px 0 8px;font-size:17px;color:#1e293b;">' + f.q + '</h3><p style="margin:0 0 6px;">' + f.a + '</p>';
  });
  h += '</div></section>';
  return h;
}
function cityDeepFaqLd(sd) {
  var d = CITY_DEEP[sd];
  if (!d) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: d.faq.map(function(f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; })
  }) + '</' + 'script>';
}

function cityLocalBlock(cfg, cn, pn, sd) {
  var hq = cfg.hq, inds = cfg.inds;
  var meet = hq ? ('总部位于青岛胶州（东关大街8号中央公园写字楼11楼），'+cn+'及周边客户可随时预约上门面谈、需求调研与阶段性验收。') : ('总部位于山东青岛，在'+cn+'采用“远程协作 + 就近项目支持”模式：需求沟通与原型评审通过视频会议高效完成，关键节点（立项、验收、上线）可安排同事到'+cn+'现场支持，合同、发票、售后标准与总部完全一致。');
  var h = '';
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>'+cn+'本地数字化服务说明</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">';
  h += '<p>'+meet+'</p>';
  h += '<p>我们为'+cn+'及'+pn+'客户提供微信小程序开发、APP 定制、企业官网与管理系统开发，源码交付、终身技术支持；需求梳理与初步报价免费，通常 1 个工作日内反馈。</p>';
  h += '<p>结合'+cn+'的产业特点，我们重点服务：'+inds.map(function(i){return '<strong>'+i+'</strong>';}).join('、')+' 等领域的数字化项目。</p>';
  h += '</div></section>';
  var faqs = [
    {q: cn+'本地可以上门面谈吗？', a: hq ? ('可以。我们在'+cn+'有固定办公地点，'+pn+cn+'客户均可预约上门沟通、驻场调研与现场验收。') : ('关键节点（立项、原型确认、上线验收）可安排同事到'+cn+'现场，日常通过视频会议与项目管理工具协作，响应不受地域影响。')},
    {q: '在'+cn+'做一个小程序或 APP 大概多少钱？', a: '价格取决于功能复杂度：展示型小程序数千元起，电商/预约类通常 1-3 万元，定制 APP 一般 1.5 万元起。标准化套餐明码标价，也可完全定制，需求确认后出具书面报价，无隐形收费。'},
    {q: '开发周期一般多长？', a: '小程序常见 3-6 周，中等功能 APP 约 8-12 周，复杂平台 3 个月以上。采用敏捷开发，每周可演示可验收，'+cn+'项目与总部执行同一交付标准。'},
    {q: '源码和售后怎么保障？', a: '全部源码与设计稿交付客户，项目文档、部署说明齐全；上线后 1 年免费维护、终身技术支持，后续迭代按人天透明计费。'},
    {q: '合同和发票怎么签？', a: '签订正式开发合同，支持'+cn+'本地企业对公打款，开具增值税发票，按里程碑付款，保障双方权益。'}
  ];
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>'+cn+'小程序/APP 开发常见问题</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 32px;line-height:1.9;">';
  faqs.forEach(function(f){ h += '<h3 style="margin:20px 0 8px;">'+f.q+'</h3><p style="margin:0 0 12px;">'+f.a+'</p>'; });
  h += '</div></section>';
  var faqLd = '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(function(f){return {'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}};})})+'</'+'script>';
  return {html:h, faqLd:faqLd};
}
function cityBreadcrumbLd(sd, pageName) {
  var base='https://'+sd+'.openai2000.cn'; var items=[{name:'首页',url:base+'/'}];
  var paths={services:'服务介绍',cases:'开发案例',about:'关于我们',templates:'模板商城',packages:'服务套餐',articles:'资讯博客',contact:'联系我们'};
  if (paths[pageName]) items.push({name:paths[pageName], url:base+'/'+pageName});
  return '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map(function(it,i){return {'@type':'ListItem',position:i+1,name:it.name,item:it.url};})})+'</'+'script>';
}
function cityBody(city, province, services, cases) {
  var cn = city.name;
  var pn = province.name;
  var svcs = services.map(function(s) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(s.title) + '</h3><p>' + esc(trunc(s.description, 120)) + '</p></article>'; }).join('\n');
  var cHtml = cases.slice(0, 6).map(function(c) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/cases/' + c.id + '">' + esc(c.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(c.client || '') + '</p><p>' + esc(trunc(c.description, 100)) + '</p></article>'; }).join('\n');
  var ct = casesCountText();
  var parts = [];
  parts.push('<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;">');
  parts.push('  <h1>' + cn + '小程序开发_企业建站_APP开发 - 汇智云码科技</h1>');
  parts.push('  <p>汇智云码科技面向' + cn + '及' + pn + '企业，专注微信小程序开发、APP定制开发、企业网站建设。' + ct + '成功案例，源码交付，终身维护。</p>');
  parts.push('  <p style="margin-top:18px;"><a href="' + SITE + '/contact" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取' + cn + '开发方案</a></p>');
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>' + cn + ' - 核心服务</h2>');
  parts.push('  <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">');
  parts.push('    ' + svcs);
  parts.push('  </div>');
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>' + cn + ' - 成功案例</h2>');
  parts.push('  ' + cHtml);
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>' + cn + '本地行业解决方案</h2>');
  parts.push('  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  parts.push('    <p>汇智云码科技深耕' + pn + '市场，深入了解' + cn + '本地企业的数字化需求。我们为' + cn + '的餐饮、零售、教育、医疗、制造等行业提供定制化的小程序开发、APP开发和企业网站建设服务。</p>');
  parts.push('    <p>无论您在' + cn + '需要微信小程序开发、H5网站开发、APP定制开发还是SaaS系统开发，汇智云码科技都能为您提供一站式数字化解决方案。</p>');
  parts.push('    <p>已服务120+企业客户，累计交付' + ct + '个项目。源码交付，终身维护，价格透明。</p>');
  parts.push('  </div>');
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>' + cn + '客户案例</h2>');
  parts.push('  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  parts.push('    <p>我们在' + cn + '已成功交付多个项目，涵盖小程序开发、APP定制和企业建站。以下是部分' + cn + '客户的合作案例：</p>');
  parts.push('    <ul><li>' + cn + '本地餐饮企业：扫码点餐小程序开发</li><li>' + cn + '零售门店：会员营销小程序开发</li><li>' + cn + '制造企业：产品选型展示网站建设</li></ul>');
  parts.push('  </div>');
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>联系汇智云码（服务' + cn + '客户）</h2>');
  parts.push('  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  parts.push('    📞 电话/微信咨询，快速响应</p>');
  parts.push('    📍 服务范围：' + cn + '全市及' + pn + '周边地区</p>');
  parts.push('    <p><a href="' + SITE + '/contact">立即咨询获取报价 →</a></p>');
  parts.push('  </div>');
  parts.push('</section>');
  return parts.join('\n');
}

function cityNavBody(provinces) {
  var gridHtml = '';
  for (var i = 0; i < provinces.length; i++) {
    var prov = provinces[i];
    var cityLinks = prov.cities.map(function(c) {
      var navRel = (typeof isIndexableCity === 'function' && isIndexableCity(c.subdomain)) ? '' : ' rel="nofollow"';
      return '<a href="https://' + c.subdomain + '.openai2000.cn/"' + navRel + ' class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;" style="display:block;padding:12px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">' + c.name + '</a>';
    }).join('\n');
    gridHtml += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + esc(prov.name) + '</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">' + cityLinks + '</div></section>\n';
  }
  return '<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;"><h1>城市服务导航 - 全国小程序开发/APP开发/网站建设服务</h1><p>汇智云码科技覆盖全国300+城市，为您提供专业的小程序开发、APP定制开发、企业网站建设服务。</p></section>\n' + gridHtml;
}

// ---------- City SEO Pages ----------
const MAIN_SITE = 'https://openai2000.cn';
const CITIES_DATA = {"provinces": [{"name": "北京市", "subdomain": "beijing", "cities": [{"name": "北京", "subdomain": "beijing"}]}, {"name": "天津市", "subdomain": "tianjin", "cities": [{"name": "天津", "subdomain": "tianjin"}]}, {"name": "上海市", "subdomain": "shanghai", "cities": [{"name": "上海", "subdomain": "shanghai"}]}, {"name": "重庆市", "subdomain": "chongqing", "cities": [{"name": "重庆", "subdomain": "chongqing"}]}, {"name": "河北省", "subdomain": "hebei", "cities": [{"name": "石家庄", "subdomain": "shijiazhuang"}, {"name": "唐山", "subdomain": "tangshan"}, {"name": "秦皇岛", "subdomain": "qinhuangdao"}, {"name": "邯郸", "subdomain": "handan"}, {"name": "邢台", "subdomain": "xingtai"}, {"name": "保定", "subdomain": "baoding"}, {"name": "张家口", "subdomain": "zhangjiakou"}, {"name": "承德", "subdomain": "chengde"}, {"name": "沧州", "subdomain": "cangzhou"}, {"name": "廊坊", "subdomain": "langfang"}, {"name": "衡水", "subdomain": "hengshui"}]}, {"name": "山西省", "subdomain": "shanxi", "cities": [{"name": "太原", "subdomain": "taiyuan"}, {"name": "大同", "subdomain": "datong"}, {"name": "阳泉", "subdomain": "yangquan"}, {"name": "长治", "subdomain": "changzhi"}, {"name": "晋城", "subdomain": "jincheng"}, {"name": "朔州", "subdomain": "shuozhou"}, {"name": "晋中", "subdomain": "jinzhong"}, {"name": "运城", "subdomain": "yuncheng"}, {"name": "忻州", "subdomain": "xinzhou"}, {"name": "临汾", "subdomain": "linfen"}, {"name": "吕梁", "subdomain": "lvliang"}]}, {"name": "内蒙古自治区", "subdomain": "neimenggu", "cities": [{"name": "呼和浩特", "subdomain": "huhehaote"}, {"name": "包头", "subdomain": "baotou"}, {"name": "乌海", "subdomain": "wuhai"}, {"name": "赤峰", "subdomain": "chifeng"}, {"name": "通辽", "subdomain": "tongliao"}, {"name": "鄂尔多斯", "subdomain": "eerduosi"}, {"name": "呼伦贝尔", "subdomain": "hulunbeier"}, {"name": "巴彦淖尔", "subdomain": "bayannaoer"}, {"name": "乌兰察布", "subdomain": "wulanchabu"}]}, {"name": "辽宁省", "subdomain": "liaoning", "cities": [{"name": "沈阳", "subdomain": "shenyang"}, {"name": "大连", "subdomain": "dalian"}, {"name": "鞍山", "subdomain": "anshan"}, {"name": "抚顺", "subdomain": "fushun"}, {"name": "本溪", "subdomain": "benxi"}, {"name": "丹东", "subdomain": "dandong"}, {"name": "锦州", "subdomain": "jinzhou"}, {"name": "营口", "subdomain": "yingkou"}, {"name": "阜新", "subdomain": "fuxin"}, {"name": "辽阳", "subdomain": "liaoyang"}, {"name": "盘锦", "subdomain": "panjin"}, {"name": "铁岭", "subdomain": "tieling"}, {"name": "朝阳", "subdomain": "chaoyang"}, {"name": "葫芦岛", "subdomain": "huludao"}]}, {"name": "吉林省", "subdomain": "jilin", "cities": [{"name": "长春", "subdomain": "changchun"}, {"name": "吉林", "subdomain": "jilin"}, {"name": "四平", "subdomain": "siping"}, {"name": "辽源", "subdomain": "liaoyuan"}, {"name": "通化", "subdomain": "tonghua"}, {"name": "白山", "subdomain": "baishan"}, {"name": "松原", "subdomain": "songyuan"}, {"name": "白城", "subdomain": "baicheng"}]}, {"name": "黑龙江省", "subdomain": "heilongjiang", "cities": [{"name": "哈尔滨", "subdomain": "haerbin"}, {"name": "齐齐哈尔", "subdomain": "qiqihaer"}, {"name": "鸡西", "subdomain": "jixi"}, {"name": "鹤岗", "subdomain": "hegang"}, {"name": "双鸭山", "subdomain": "shuangyashan"}, {"name": "大庆", "subdomain": "daqing"}, {"name": "伊春", "subdomain": "yichun-hlj"}, {"name": "佳木斯", "subdomain": "jiamusi"}, {"name": "七台河", "subdomain": "qitaihe"}, {"name": "牡丹江", "subdomain": "mudanjiang"}, {"name": "黑河", "subdomain": "heihe"}, {"name": "绥化", "subdomain": "suihua"}]}, {"name": "江苏省", "subdomain": "jiangsu", "cities": [{"name": "南京", "subdomain": "nanjing"}, {"name": "无锡", "subdomain": "wuxi"}, {"name": "徐州", "subdomain": "xuzhou"}, {"name": "常州", "subdomain": "changzhou"}, {"name": "苏州", "subdomain": "suzhou"}, {"name": "南通", "subdomain": "nantong"}, {"name": "连云港", "subdomain": "lianyungang"}, {"name": "淮安", "subdomain": "huaian"}, {"name": "盐城", "subdomain": "yancheng"}, {"name": "扬州", "subdomain": "yangzhou"}, {"name": "镇江", "subdomain": "zhenjiang"}, {"name": "泰州", "subdomain": "taizhou-js"}, {"name": "宿迁", "subdomain": "suqian"}]}, {"name": "浙江省", "subdomain": "zhejiang", "cities": [{"name": "杭州", "subdomain": "hangzhou"}, {"name": "宁波", "subdomain": "ningbo"}, {"name": "温州", "subdomain": "wenzhou"}, {"name": "嘉兴", "subdomain": "jiaxing"}, {"name": "湖州", "subdomain": "huzhou"}, {"name": "绍兴", "subdomain": "shaoxing"}, {"name": "金华", "subdomain": "jinhua"}, {"name": "衢州", "subdomain": "quzhou"}, {"name": "舟山", "subdomain": "zhoushan"}, {"name": "台州", "subdomain": "taizhou"}, {"name": "丽水", "subdomain": "lishui"}]}, {"name": "安徽省", "subdomain": "anhui", "cities": [{"name": "合肥", "subdomain": "hefei"}, {"name": "芜湖", "subdomain": "wuhu"}, {"name": "蚌埠", "subdomain": "bengbu"}, {"name": "淮南", "subdomain": "huainan"}, {"name": "马鞍山", "subdomain": "maanshan"}, {"name": "淮北", "subdomain": "huaibei"}, {"name": "铜陵", "subdomain": "tongling"}, {"name": "安庆", "subdomain": "anqing"}, {"name": "黄山", "subdomain": "huangshan"}, {"name": "滁州", "subdomain": "chuzhou"}, {"name": "阜阳", "subdomain": "fuyang"}, {"name": "宿州", "subdomain": "suzhou-ah"}, {"name": "六安", "subdomain": "luan"}, {"name": "亳州", "subdomain": "bozhou"}, {"name": "池州", "subdomain": "chizhou"}, {"name": "宣城", "subdomain": "xuancheng"}]}, {"name": "福建省", "subdomain": "fujian", "cities": [{"name": "福州", "subdomain": "fuzhou"}, {"name": "厦门", "subdomain": "xiamen"}, {"name": "莆田", "subdomain": "putian"}, {"name": "三明", "subdomain": "sanming"}, {"name": "泉州", "subdomain": "quanzhou"}, {"name": "漳州", "subdomain": "zhangzhou"}, {"name": "南平", "subdomain": "nanping"}, {"name": "龙岩", "subdomain": "longyan"}, {"name": "宁德", "subdomain": "ningde"}]}, {"name": "江西省", "subdomain": "jiangxi", "cities": [{"name": "南昌", "subdomain": "nanchang"}, {"name": "景德镇", "subdomain": "jingdezhen"}, {"name": "萍乡", "subdomain": "pingxiang"}, {"name": "九江", "subdomain": "jiujiang"}, {"name": "新余", "subdomain": "xinyu"}, {"name": "鹰潭", "subdomain": "yingtan"}, {"name": "赣州", "subdomain": "ganzhou"}, {"name": "吉安", "subdomain": "jian"}, {"name": "宜春", "subdomain": "yichun"}, {"name": "抚州", "subdomain": "fuzhou-jx"}, {"name": "上饶", "subdomain": "shangrao"}]}, {"name": "山东省", "subdomain": "shandong", "cities": [{"name": "济南", "subdomain": "jinan"}, {"name": "青岛", "subdomain": "qingdao"}, {"name": "淄博", "subdomain": "zibo"}, {"name": "枣庄", "subdomain": "zaozhuang"}, {"name": "东营", "subdomain": "dongying"}, {"name": "烟台", "subdomain": "yantai"}, {"name": "潍坊", "subdomain": "weifang"}, {"name": "济宁", "subdomain": "jining"}, {"name": "泰安", "subdomain": "taian"}, {"name": "威海", "subdomain": "weihai"}, {"name": "日照", "subdomain": "rizhao"}, {"name": "临沂", "subdomain": "linyi"}, {"name": "德州", "subdomain": "dezhou"}, {"name": "聊城", "subdomain": "liaocheng"}, {"name": "滨州", "subdomain": "binzhou"}, {"name": "菏泽", "subdomain": "heze"}]}, {"name": "河南省", "subdomain": "henan", "cities": [{"name": "郑州", "subdomain": "zhengzhou"}, {"name": "开封", "subdomain": "kaifeng"}, {"name": "洛阳", "subdomain": "luoyang"}, {"name": "平顶山", "subdomain": "pingdingshan"}, {"name": "安阳", "subdomain": "anyang"}, {"name": "新乡", "subdomain": "xinxiang"}, {"name": "焦作", "subdomain": "jiaozuo"}, {"name": "濮阳", "subdomain": "puyang"}, {"name": "许昌", "subdomain": "xuchang"}, {"name": "漯河", "subdomain": "luohe"}, {"name": "三门峡", "subdomain": "sanmenxia"}, {"name": "南阳", "subdomain": "nanyang"}, {"name": "商丘", "subdomain": "shangqiu"}, {"name": "信阳", "subdomain": "xinyang"}, {"name": "周口", "subdomain": "zhoukou"}, {"name": "驻马店", "subdomain": "zhumadian"}]}, {"name": "湖北省", "subdomain": "hubei", "cities": [{"name": "武汉", "subdomain": "wuhan"}, {"name": "黄石", "subdomain": "huangshi"}, {"name": "十堰", "subdomain": "shiyan"}, {"name": "宜昌", "subdomain": "yichang"}, {"name": "襄阳", "subdomain": "xiangyang"}, {"name": "鄂州", "subdomain": "ezhou"}, {"name": "荆门", "subdomain": "jingmen"}, {"name": "孝感", "subdomain": "xiaogan"}, {"name": "荆州", "subdomain": "jingzhou"}, {"name": "黄冈", "subdomain": "huanggang"}, {"name": "咸宁", "subdomain": "xianning"}, {"name": "随州", "subdomain": "suizhou"}]}, {"name": "湖南省", "subdomain": "hunan", "cities": [{"name": "长沙", "subdomain": "changsha"}, {"name": "株洲", "subdomain": "zhuzhou"}, {"name": "湘潭", "subdomain": "xiangtan"}, {"name": "衡阳", "subdomain": "hengyang"}, {"name": "邵阳", "subdomain": "shaoyang"}, {"name": "岳阳", "subdomain": "yueyang"}, {"name": "常德", "subdomain": "changde"}, {"name": "张家界", "subdomain": "zhangjiajie"}, {"name": "益阳", "subdomain": "yiyang"}, {"name": "郴州", "subdomain": "chenzhou"}, {"name": "永州", "subdomain": "yongzhou"}, {"name": "怀化", "subdomain": "huaihua"}, {"name": "娄底", "subdomain": "loudi"}]}, {"name": "广东省", "subdomain": "guangdong", "cities": [{"name": "广州", "subdomain": "guangzhou"}, {"name": "韶关", "subdomain": "shaoguan"}, {"name": "深圳", "subdomain": "shenzhen"}, {"name": "珠海", "subdomain": "zhuhai"}, {"name": "汕头", "subdomain": "shantou"}, {"name": "佛山", "subdomain": "foshan"}, {"name": "江门", "subdomain": "jiangmen"}, {"name": "湛江", "subdomain": "zhanjiang"}, {"name": "茂名", "subdomain": "maoming"}, {"name": "肇庆", "subdomain": "zhaoqing"}, {"name": "惠州", "subdomain": "huizhou"}, {"name": "梅州", "subdomain": "meizhou"}, {"name": "汕尾", "subdomain": "shanwei"}, {"name": "河源", "subdomain": "heyuan"}, {"name": "阳江", "subdomain": "yangjiang"}, {"name": "清远", "subdomain": "qingyuan"}, {"name": "东莞", "subdomain": "dongguan"}, {"name": "中山", "subdomain": "zhongshan"}, {"name": "潮州", "subdomain": "chaozhou"}, {"name": "揭阳", "subdomain": "jieyang"}, {"name": "云浮", "subdomain": "yunfu"}]}, {"name": "广西壮族自治区", "subdomain": "guangxi", "cities": [{"name": "南宁", "subdomain": "nanning"}, {"name": "柳州", "subdomain": "liuzhou"}, {"name": "桂林", "subdomain": "guilin"}, {"name": "梧州", "subdomain": "wuzhou"}, {"name": "北海", "subdomain": "beihai"}, {"name": "防城港", "subdomain": "fangchenggang"}, {"name": "钦州", "subdomain": "qinzhou"}, {"name": "贵港", "subdomain": "guigang"}, {"name": "玉林", "subdomain": "yulin-gx"}, {"name": "百色", "subdomain": "baise"}, {"name": "贺州", "subdomain": "hezhou"}, {"name": "河池", "subdomain": "hechi"}, {"name": "来宾", "subdomain": "laibin"}, {"name": "崇左", "subdomain": "chongzuo"}]}, {"name": "海南省", "subdomain": "hainan", "cities": [{"name": "海口", "subdomain": "haikou"}, {"name": "三亚", "subdomain": "sanya"}, {"name": "三沙", "subdomain": "sansha"}, {"name": "儋州", "subdomain": "danzhou"}]}, {"name": "四川省", "subdomain": "sichuan", "cities": [{"name": "成都", "subdomain": "chengdu"}, {"name": "自贡", "subdomain": "zigong"}, {"name": "攀枝花", "subdomain": "panzhihua"}, {"name": "泸州", "subdomain": "luzhou"}, {"name": "德阳", "subdomain": "deyang"}, {"name": "绵阳", "subdomain": "mianyang"}, {"name": "广元", "subdomain": "guangyuan"}, {"name": "遂宁", "subdomain": "suining"}, {"name": "内江", "subdomain": "neijiang"}, {"name": "乐山", "subdomain": "leshan"}, {"name": "南充", "subdomain": "nanchong"}, {"name": "眉山", "subdomain": "meishan"}, {"name": "宜宾", "subdomain": "yibin"}, {"name": "广安", "subdomain": "guangan"}, {"name": "达州", "subdomain": "dazhou"}, {"name": "雅安", "subdomain": "yaan"}, {"name": "巴中", "subdomain": "bazhong"}, {"name": "资阳", "subdomain": "ziyang"}]}, {"name": "贵州省", "subdomain": "guizhou", "cities": [{"name": "贵阳", "subdomain": "guiyang"}, {"name": "六盘水", "subdomain": "liupanshui"}, {"name": "遵义", "subdomain": "zunyi"}, {"name": "安顺", "subdomain": "anshun"}, {"name": "毕节", "subdomain": "bijie"}, {"name": "铜仁", "subdomain": "tongren"}]}, {"name": "云南省", "subdomain": "yunnan", "cities": [{"name": "昆明", "subdomain": "kunming"}, {"name": "曲靖", "subdomain": "qujing"}, {"name": "玉溪", "subdomain": "yuxi"}, {"name": "保山", "subdomain": "baoshan"}, {"name": "昭通", "subdomain": "zhaotong"}, {"name": "丽江", "subdomain": "lijiang"}, {"name": "普洱", "subdomain": "puer"}, {"name": "临沧", "subdomain": "lincang"}]}, {"name": "西藏自治区", "subdomain": "xizang", "cities": [{"name": "拉萨", "subdomain": "lasa"}, {"name": "日喀则", "subdomain": "rikaze"}, {"name": "昌都", "subdomain": "changdu"}, {"name": "林芝", "subdomain": "linzhi"}]}, {"name": "陕西省", "subdomain": "shaanxi", "cities": [{"name": "西安", "subdomain": "xian"}, {"name": "铜川", "subdomain": "tongchuan"}, {"name": "宝鸡", "subdomain": "baoji"}, {"name": "咸阳", "subdomain": "xianyang"}, {"name": "渭南", "subdomain": "weinan"}, {"name": "延安", "subdomain": "yanan"}, {"name": "汉中", "subdomain": "hanzhong"}, {"name": "榆林", "subdomain": "yulin"}, {"name": "安康", "subdomain": "ankang"}, {"name": "商洛", "subdomain": "shangluo"}]}, {"name": "甘肃省", "subdomain": "gansu", "cities": [{"name": "兰州", "subdomain": "lanzhou"}, {"name": "嘉峪关", "subdomain": "jiayuguan"}, {"name": "金昌", "subdomain": "jinchang"}, {"name": "白银", "subdomain": "baiyin"}, {"name": "天水", "subdomain": "tianshui"}, {"name": "武威", "subdomain": "wuwei"}, {"name": "张掖", "subdomain": "zhangye"}, {"name": "平凉", "subdomain": "pingliang"}, {"name": "酒泉", "subdomain": "jiuquan"}, {"name": "庆阳", "subdomain": "qingyang"}, {"name": "定西", "subdomain": "dingxi"}, {"name": "陇南", "subdomain": "longnan"}]}, {"name": "青海省", "subdomain": "qinghai", "cities": [{"name": "西宁", "subdomain": "xining"}, {"name": "海东", "subdomain": "haidong"}]}, {"name": "宁夏回族自治区", "subdomain": "ningxia", "cities": [{"name": "银川", "subdomain": "yinchuan"}, {"name": "石嘴山", "subdomain": "shizuishan"}, {"name": "吴忠", "subdomain": "wuzhong"}, {"name": "固原", "subdomain": "guyuan"}, {"name": "中卫", "subdomain": "zhongwei"}]}, {"name": "新疆维吾尔自治区", "subdomain": "xinjiang", "cities": [{"name": "乌鲁木齐", "subdomain": "wulumuqi"}, {"name": "克拉玛依", "subdomain": "kelamayi"}, {"name": "吐鲁番", "subdomain": "tulufan"}, {"name": "哈密", "subdomain": "hami"}]}, {"name": "台湾省", "subdomain": "taiwan", "cities": [{"name": "台北", "subdomain": "taibei"}, {"name": "高雄", "subdomain": "gaoxiong"}, {"name": "台中", "subdomain": "taizhong"}]}, {"name": "香港特别行政区", "subdomain": "hongkong", "cities": [{"name": "香港", "subdomain": "hongkong"}]}, {"name": "澳门特别行政区", "subdomain": "aomen", "cities": [{"name": "澳门", "subdomain": "aomen"}]}]};


// ===== SPA city index.html generator =====
function generateSpaIndex(indexPath, cityName, subdomain) {
  var SITE_BASE = 'https://' + subdomain + '.openai2000.cn';
  var html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    '<title>' + cityName + '小程序开发_企业建站_APP开发 - 汇智云码科技</title>'
  );
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    '<meta name="description" content="汇智云码科技面向' + cityName + '及周边企业提供微信小程序开发、APP定制开发、企业网站建设服务。120+企业客户，200+成功案例，源码交付，免费报价。">'
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]*">/,
    '<meta name="keywords" content="' + cityName + '小程序开发,' + cityName + 'APP开发,' + cityName + '网站建设,' + cityName + '软件开发公司,微信小程序定制,APP定制开发">'
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    '<meta property="og:title" content="汇智云码科技 - 专业App/小程序定制开发 | ' + cityName + '软件开发公司">'
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    '<meta property="og:description" content="' + cityName + '专业软件开发公司，120+企业客户，200+成功案例。专注微信小程序、APP定制开发、企业网站建设。">'
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*">/,
    '<meta property="og:url" content="' + SITE_BASE + '/">'
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + SITE_BASE + '/">'
  );
  // 【SEO 修复】非重点城市禁止索引，避免批量薄内容站群惩罚
  var isPriority = (typeof isIndexableCity === 'function') ? isIndexableCity(subdomain)
                   : ((typeof PRIORITY_CITIES !== 'undefined') && !!PRIORITY_CITIES[subdomain]);
  if (!isPriority) {
    if (/<meta name="robots"[^>]*>/.test(html)) {
      html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,follow">');
    } else {
      html = html.replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>');
    }
  }
  return html;
}

function cityPage(subdomain, cityName, provName, page, opts) {
  var SITE_BASE = "https://" + subdomain + ".openai2000.cn";
  var MAIN_SITE = "https://openai2000.cn";
  var title = opts.title || "";
  var description = opts.description || "";
  var keywords = opts.keywords || "";
  var body = opts.body || "";
  var jsonLd = opts.jsonLd || "";
  var canonical = SITE_BASE + "/" + (page === "index" ? "" : page);
  jsonLd = (jsonLd || "") + cityBreadcrumbLd(subdomain, page);
  if (isIndexableCity(subdomain)) {
    jsonLd = jsonLd + cityServiceJsonLd(subdomain, cityName, provName, description);
    if (OFFICE_CITIES.indexOf(subdomain) >= 0 && (page === 'index' || page === 'contact')) {
      jsonLd = jsonLd + localBusinessJsonLd(opts.info || null, 'https://' + subdomain + '.openai2000.cn/', cityName);
    }
  }
  var robots = opts.robots || (isIndexableCity(subdomain) ? "index,follow" : "noindex,follow");

  var navItems = [
    {path: "/", label: "\u9996\u9875"},
    {path: "/services", label: "\u670d\u52a1"},
    {path: "/cases", label: "\u6848\u4f8b"},
    {path: "https://openai2000.cn/templates", label: "\u6a21\u677f\u5546\u57ce"},
    {path: "/articles", label: "\u8d44\u8baf"},
    {path: "/about", label: "\u5173\u4e8e"},
    {path: "https://openai2000.cn/packages", label: "\u670d\u52a1\u5957\u9910"},
    {path: "/contact", label: "\u8054\u7cfb"}
  ];
  var currentPage = page === "index" ? "/" : "/" + page;
  var navHtml = navItems.map(function(item) {
    var activeClass = (item.path === currentPage) ? ' class="active"' : '';
    var href = item.path.startsWith('http') ? item.path : SITE_BASE + item.path;
    return '<a href="' + href + '"' + activeClass + '>' + item.label + '</a>';
  }).join("\n        ");

  var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n'
    + '<meta charset="UTF-8">\n'
    + '<meta name="baidu-site-verification" content="codeva-geushDpNvl" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '<title>' + esc(title) + '</title>\n'
    + '<meta name="description" content="' + esc(description) + '" />\n'
    + '<meta name="keywords" content="' + esc(keywords) + '" />\n'
    + '<link rel="canonical" href="' + canonical + '" />\n'
    + '<meta property="og:title" content="' + esc(title) + '" />\n'
    + '<meta property="og:description" content="' + esc(description) + '" />\n'
    + '<meta property="og:type" content="website" />\n'
    + '<meta property="og:url" content="' + canonical + '" />\n'
    + '<meta name="robots" content="' + robots + '" />\n'
    + '<link rel="icon" type="image/svg+xml" href="' + MAIN_SITE + '/favicon.svg">\n'
    + '<link rel="stylesheet" href="' + MAIN_SITE + '/assets/' + MAIN_CSS + '">\n'
    + '<script>var _hmt=_hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?289eab39430e2f97aa77b242004802b3";var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s);})();</script>\n'
    + jsonLd + '\n</head>\n<body>\n'
    // Header - matches main site structure
    + '<header class="site-header"><div class="container"><div class="header-inner">\n'
    + '<a href="' + SITE_BASE + '/" class="logo">\n'
    + '  <div class="logo-icon">\u6c47</div>\n'
    + '  <div class="logo-text"><strong>\u6c47\u667a\u4e91\u7801\u79d1\u6280</strong><em>HUIZHIYUNMA</em></div>\n'
    + '</a>\n'
    + '<nav class="nav">\n        ' + navHtml + '\n    </nav>\n'
    + '</div></div></header>\n'
    // Main content
    + '<main>' + body + '</main>\n'
    // Footer - matches main site structure
    + '<footer class="site-footer"><div class="container">\n'
    + '<div class="footer-grid">\n'
    + '  <div class="footer-col">\n'
    + '    <h4>\u6c47\u667a\u4e91\u7801\u79d1\u6280</h4>\n'
    + '    <p>\u4e13\u4e1a\u63d0\u4f9b\u5fae\u4fe1\u5c0f\u7a0b\u5e8f\u5f00\u53d1\u3001APP\u5b9a\u5236\u5f00\u53d1\u3001\u4f01\u4e1a\u7f51\u7ad9\u5efa\u8bbe\u670d\u52a1\u3002</p>\n'
    + '  </div>\n'
    + '  <div class="footer-col">\n'
    + '    <h4>\u670d\u52a1</h4>\n'
    + '    <ul><li><a href="' + SITE_BASE + '/services">\u5c0f\u7a0b\u5e8f\u5f00\u53d1</a></li>\n'
    + '    <li><a href="' + SITE_BASE + '/services">APP\u5b9a\u5236\u5f00\u53d1</a></li>\n'
    + '    <li><a href="' + SITE_BASE + '/services">\u7f51\u7ad9\u5efa\u8bbe</a></li></ul>\n'
    + '  </div>\n'
    + '  <div class="footer-col">\n'
    + '    <h4>\u8d44\u6e90</h4>\n'
    + '    <ul><li><a href="' + SITE_BASE + '/cases">\u5f00\u53d1\u6848\u4f8b</a></li>\n'
    + '    <li><a href="' + SITE_BASE + '/articles">\u6280\u672f\u8d44\u8baf</a></li>\n'
    + '    <li><a href="' + SITE_BASE + '/templates">\u7f51\u7ad9\u6a21\u677f</a></li></ul>\n'
    + '  </div>\n'
    + '  <div class="footer-col">\n'
    + '    <h4>\u8054\u7cfb\u6211\u4eec</h4>\n'
    + '    <p>\u83b7\u53d6\u514d\u8d39\u65b9\u6848\u4e0e\u62a5\u4ef7</p>\n'
    + '    <a href="' + SITE_BASE + '/contact" class="btn btn-primary">\u7acb\u5373\u54a8\u8be2</a>\n'
    + '  </div>\n'
    + '</div>\n'
    + '<div class="copyright-links" style="margin-top:10px"><a href="https://ai.openai2000.cn">智云互联AI - AI工具导航与实操教程</a></div>\n'
    + '<div class="copyright">\n'
    + '  <p>\u00a9 2026 \u6c47\u667a\u4e91\u7801\u79d1\u6280 \u7248\u6743\u6240\u6709</p>\n'
    + (FOOTER_ICP ? '  <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow noopener">' + esc(FOOTER_ICP) + '</a></p>\n' : '')
    + '</div>\n'
    + '</div></footer>\n'
    + '</body>\n</html>';

  return html;
}

function cityHomeBody(cn, services, cases, articles, templates, cityObj, provName) {
  var cfg = cityObj ? PRIORITY_CITIES[cityObj.subdomain] : null;
  var block = cfg ? cityLocalBlock(cfg, cn, provName, cityObj.subdomain) : null;
  if (cfg) cases = pickLocalCases(cases, cfg.inds, 6);
  var svcs = services.map(function(s) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(s.title) + '</h3><p>' + esc(trunc(s.description, 120)) + '</p></article>'; }).join("\n");
  var cHtml = cases.slice(0, 6).map(function(c) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/cases/' + c.id + '">' + esc(c.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(c.client || '') + '</p><p>' + esc(trunc(c.description, 100)) + '</p></article>'; }).join("\n");
  var aHtml = articles.slice(0, 6).map(function(a) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/articles/' + a.id + '">' + esc(a.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + (a.published_at ? String(a.published_at).slice(0,10) : '') + '</p><p>' + esc(trunc(a.summary, 80)) + '</p></article>'; }).join("\n");
  var tHtml = templates.map(function(t) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(t.name) + '</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">\u00a5' + Number(t.price).toFixed(0) + '</p><p>' + esc(t.description || '') + '</p></article>'; }).join("\n");
  var ct = casesCountText();
  var parts = [];
  parts.push('<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;">');
  parts.push('  <h1>' + cn + '\u5c0f\u7a0b\u5e8f\u5f00\u53d1_' + cn + 'APP\u5b9a\u5236\u5f00\u53d1_' + cn + '\u4f01\u4e1a\u7f51\u7ad9\u5efa\u8bbe</h1>');
  parts.push('  <p>汇智云码科技面向' + cn + '及周边企业，专注微信小程序开发、APP定制开发、企业网站建设。' + ct + '成功案例，源码交付，终身维护。</p>');
  parts.push('  <p style="margin-top:18px;"><a href="' + SITE + '/contact" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">\u514d\u8d39\u83b7\u53d6' + cn + '\u5f00\u53d1\u65b9\u6848</a></p>');
  parts.push('</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + cn + '\u6838\u5fc3\u670d\u52a1</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + svcs + '</div></section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + cn + '\u6210\u529f\u6848\u4f8b</h2>' + cHtml + '</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + cn + '\u4f01\u4e1a\u7f51\u7ad9\u6a21\u677f</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + tHtml + '</div></section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + cn + '\u6700\u65b0\u8d44\u8baf</h2>' + aHtml + '</section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>\u4e3a\u4ec0\u4e48\u9009\u62e9\u6c47\u667a\u4e91\u7801\u79d1\u6280\uff1f</h2><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  parts.push('    <p>\u6c47\u667a\u4e91\u7801\u79d1\u6280\u6210\u7acb\u4e8e2020\u5e74\uff0c\u603b\u90e8\u4f4d\u4e8e\u9752\u5c9b\uff0c\u6838\u5fc3\u56e2\u961f\u6765\u81ea\u817e\u8baf\u3001\u963f\u91cc\u3001\u5b57\u8282\u3002\u6211\u4eec\u5728' + cn + '\u63d0\u4f9b\u4e13\u4e1a\u7684\u5c0f\u7a0b\u5e8f\u5f00\u53d1\u3001APP\u5b9a\u5236\u5f00\u53d1\u548c\u4f01\u4e1a\u7f51\u7ad9\u5efa\u8bbe\u670d\u52a1\u3002</p>');
  parts.push('    <p>\u5df2\u670d\u52a1120+\u4f01\u4e1a\u5ba2\u6237\uff0c\u7d2f\u8ba1\u4ea4\u4ed8' + ct + '\u4e2a\u9879\u76ee\u3002\u6e90\u7801\u4ea4\u4ed8\uff0c\u7ec8\u8eab\u7ef4\u62a4\uff0c\u4ef7\u683c\u900f\u660e\u3002</p>');
  parts.push('  </div></section>');
  if (CITY_DEEP[cityObj.subdomain]) parts.push(cityDeepBlock(cityObj.subdomain, cn, provName));
  else if (block) parts.push(block.html);
  parts.push(cityCrossLinks(cityObj.subdomain));
  return parts.join("\n");
}

function cityServicesBody(sd, cn, services) {
  var cfg = PRIORITY_CITIES[sd];
  var intro = "从需求分析到上线运营的一站式数字化解决方案。";
  if (cfg && cfg.inds) {
    var inds = cfg.inds.join('、');
    intro = "面向" + cn + "本地" + inds + "等产业，提供从需求分析到上线运营的一站式数字化定制开发服务。";
  }
  var svcs = services.map(function(s) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(s.title) + '</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">\u53c2\u8003\u4ef7\u683c\uff1a\u00a5' + Number(s.price_min).toLocaleString() + ' - \u00a5' + Number(s.price_max).toLocaleString() + '</p><p>' + esc(trunc(s.description, 150)) + '</p></article>'; }).join("\n");
  return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u4f01\u4e1a\u5efa\u7ad9 \u00b7 \u5c0f\u7a0b\u5e8f \u00b7 APP\u5f00\u53d1\u670d\u52a1</h1><p>' + intro + '</p></section><section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + svcs + '</div></section>';
}

function cityCasesBody(sd, cn, cases) {
  var cfg = PRIORITY_CITIES[sd];
  var filtered = cases;
  if (cfg && cfg.inds) {
    filtered = pickLocalCases(cases, cfg.inds, 100);
    if (filtered.length > 0) cases = filtered;
  }
  var ct = casesCountText();
  var intro = ct + '成功案例，覆盖餐饮、制造、教育、医疗、跨境、酒店等多个行业。';
  if (cfg && cfg.inds) {
    var indsText = cfg.inds.join('、');
    intro = cn + '本地' + cases.length + '个成功案例，覆盖' + indsText + '等本地重点产业。';
  }
  var items = cases.slice(0, 16).map(function(c) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/cases/' + c.id + '">' + esc(c.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(c.category) + ' \u00b7 ' + esc(c.client) + '</p><p>' + esc(trunc(c.description, 100)) + '</p></article>'; }).join("\n");
  return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u5f00\u53d1\u6848\u4f8b</h1><p>' + intro + '</p></section>' + items;
}

function cityArticlesBody(cn, articles) {
  var items = articles.map(function(a) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/articles/' + a.id + '">' + esc(a.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(a.category) + ' \u00b7 ' + (a.published_at ? String(a.published_at).slice(0,10) : '') + '</p><p>' + esc(trunc(a.summary, 80)) + '</p></article>'; }).join("\n");
  return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u884c\u4e1a\u8d44\u8baf\u4e0e\u5f00\u53d1\u77e5\u8bc6</h1><p>\u7f51\u7ad9\u5efa\u8bbe\u3001\u5c0f\u7a0b\u5e8f\u5f00\u53d1\u3001APP\u5f00\u53d1\u7684\u6280\u672f\u5e72\u8d27\u4e0e\u884c\u4e1a\u8d8b\u52bf\u3002</p></section>' + items;
}

function cityAboutBody(cn, info) {
  var intro = info ? (info.company_intro || "") : "";
  return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>\u5173\u4e8e\u6c47\u667a\u4e91\u7801\u79d1\u6280</h1><p>' + cn + '\u8f6f\u4ef6\u5f00\u53d1\u516c\u53f8\uff0c\u56e2\u961f\u6838\u5fc3\u6210\u5458\u6765\u81ea\u817e\u8baf\u3001\u963f\u91cc\u3001\u5b57\u8282\u3002</p></section><section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">' + intro + '</div></section>';
}

function cityTemplatesBody(cn, templates) {
  var items = templates.map(function(t) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(t.name) + '</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">\u4ef7\u683c\uff1a<strong>\u00a5' + Number(t.price).toFixed(0) + '</strong></p><p>' + esc(t.description || '') + '</p></article>'; }).join("\n");
  return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u4f01\u4e1a\u7f51\u7ad9\u6a21\u677f\u5546\u57ce</h1><p>\u7cbe\u9009\u4f01\u4e1a\u7ea7\u7f51\u7ad9\u6a21\u677f\uff0c\u8d2d\u4e70\u540e\u6e90\u7801\u4ea4\u4ed8\uff0c\u652f\u6301\u4e8c\u6b21\u5f00\u53d1\u3002</p></section><section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + items + '</div></section>';
}

function cityPackagesBody(cn, packages) {
  if (!packages || packages.length === 0) return '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u8f6f\u4ef6\u5f00\u53d1\u5957\u9910</h1><p>\u7f51\u7ad9\u5efa\u8bbe\u3001\u5c0f\u7a0b\u5e8f\u3001APP\u6807\u51c6\u5316\u5f00\u53d1\u5957\u9910\uff0c\u660e\u7801\u6807\u4ef7\u3002</p></section>';
  var bizMap = { website: "\u7f51\u7ad9\u5efa\u8bbe", miniapp: "\u5c0f\u7a0b\u5e8f", app: "APP\u5f00\u53d1" };
  var group = {};
  for (var i = 0; i < packages.length; i++) {
    var p = packages[i];
    var k = bizMap[p.biz_type] || p.biz_type;
    if (!group[k]) group[k] = [];
    group[k].push(p);
  }
  var html = '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u8f6f\u4ef6\u5f00\u53d1\u5957\u9910 \u00b7 \u660e\u7801\u6807\u4ef7</h1><p>\u6309\u884c\u4e1a\u6807\u51c6\u5316\u914d\u7f6e\uff0c\u660e\u7801\u6807\u4ef7\u3002</p></section>';
  var types = Object.keys(group);
  for (var t = 0; t < types.length; t++) {
    var type = types[t];
    var list = group[type];
    var items = list.map(function(p) { return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(p.name) + '(' + esc(p.industry) + ')</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">\u660e\u7801\u6807\u4ef7\uff1a<strong>\u00a5' + Number(p.price).toFixed(0) + '</strong></p><p>' + esc((p.features || "").split("|").slice(0, 4).join("\u3001")) + '</p></article>'; }).join("\n");
    html += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + type + '\u5f00\u53d1\u5957\u9910</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' + items + '</div></section>';
  }
  return html;
}

function cityContactBody(cn, info) {
  var phone = info && (info.company_phone || info.phone) ? esc(info.company_phone || info.phone) : "";
  var wechat = info && (info.company_wechat || info.wechat) ? esc(info.company_wechat || info.wechat) : "";
  var address = info && (info.company_address || info.address) ? esc(info.company_address || info.address) : "\u5c71\u4e1c\u9752\u5c9b";
  var email = info && (info.company_email || info.email) ? esc(info.company_email || info.email) : "";
  var cm = getMobile(info);
  var cmMask = cm ? esc(maskMobile(cm)) : "";
  var cmData = cm ? (cm.slice(0,3)+'-'+cm.slice(3,7)+'-'+cm.slice(7)) : "";
  var parts = [];
  if (cm) parts.push('<p>📱 手机/微信同号（点击拨打）：<a href="#" data-tel="'+cmData+'" class="js-tel" style="font-size:20px;font-weight:bold;color:#1d4ed8;">'+cmMask+'</a></p>');
  if (cm) parts.push('<'+'script>(function(){var a=document.querySelector(".js-tel");if(a){a.addEventListener("click",function(e){e.preventDefault();location.href="tel:"+this.getAttribute("data-tel").replace(/\D/g,"");});}})();<'+'/script>');
  parts.push('<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>' + cn + '\u8054\u7cfb\u6211\u4eec</h1><p>\u83b7\u53d6\u4f01\u4e1a\u7f51\u7ad9\u5efa\u8bbe\u3001\u5c0f\u7a0b\u5e8f\u5f00\u53d1\u3001APP\u5b9a\u5236\u5f00\u53d1\u65b9\u6848\u4e0e\u62a5\u4ef7\u3002</p></section>');
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  if (phone) parts.push('<p>\ud83d\udc27 QQ\uff1a' + phone + '</p>');
  if (wechat && wechat !== "\u626b\u4e8c\u7ef4\u7801") parts.push('<p>\ud83d\udcac \u5fae\u4fe1\uff1a' + wechat + '</p>');
  if (email) parts.push('<p>\ud83d\udce7 \u90ae\u7bb1\uff1a<a href="mailto:' + email + '">' + email + '</a></p>');
  parts.push('<p>\ud83d\udccd \u5730\u5740\uff1a' + address + '</p>');
  parts.push('<p>\ud83d\udcf7 \u5fae\u4fe1\u626b\u7801\u54a8\u8be2\uff1a<br><img src="https://openai2000.cn/uploads/wechat_qr.png" alt="\u6c47\u667a\u4e91\u7801\u79d1\u6280\u5fae\u4fe1\u4e8c\u7ef4\u7801" style="width:160px;height:160px;border-radius:8px;margin-top:8px;"></p>');
  parts.push('</div></section>');
  return parts.join("\n");
}

// ---------- main flow ----------
(async () => {
  try {
    const pool = await getPool();
    const [services] = await pool.query('SELECT * FROM services WHERE status=1 ORDER BY sort_order');
    const [cases] = await pool.query('SELECT * FROM cases WHERE status=1 ORDER BY sort_order, id');
    const [articles] = await pool.query('SELECT * FROM articles WHERE status=1 ORDER BY id');
    const [[{ caseTotal }]] = await pool.query('SELECT COUNT(*) AS caseTotal FROM cases WHERE status=1');
    CASES_TOTAL = caseTotal;
    const [companyRows] = await pool.query('SELECT * FROM company_info');
    const info = {};
    for (const r of companyRows) info[r.item_key] = r.item_value;
    FOOTER_ICP = (info.icp_record || '').trim();
    FOOTER_BEIAN = (info.public_security || '').trim();
    // templates 在 pay_system 库，单独查
    const payPool = await mysql.createPool({
      host: process.env.PAY_DB_HOST || process.env.DB_HOST,
      port: process.env.PAY_DB_PORT || process.env.DB_PORT,
      user: process.env.PAY_DB_USER || 'pay_system',
      password: process.env.PAY_DB_PASSWORD || 'PaySystem@2026',
      database: process.env.PAY_DB_NAME || 'pay_system_db',
      charset: 'utf8mb4',
      connectionLimit: 2,
    });
    const [templates] = await payPool.query('SELECT * FROM templates WHERE status=1 ORDER BY sort_order');
    const [packages] = await pool.query('SELECT * FROM service_packages WHERE status=1 ORDER BY biz_type, FIELD(industry,"电商","餐饮","美容预约","教育","同城服务","通用"), FIELD(level,"basic","pro","flagship")');
    // 行业方案数据（用于文章页内链推荐）
    const solutions = INDUSTRIES.map(ind => ({ name: ind.name, slug: ind.slug, industry: ind.name, description: ind.description, summary: ind.description }));

    // 0) 生成/补齐案例封面 + 文章封面（列表页、详情页、Article schema 生成前调用）
    ensureCaseImages(cases);
    ensureArticleImages(articles);

    // 1) 静态页（首页用 index.seo.html，避免覆盖 SPA 的 index.html；由 nginx 对爬虫 rewrite）
    const pages = [
      { file: 'index.seo.html',   html: seoPage('/', { ogImage: `${SITE}/seo/images/og-cover.png`, title: '汇智云码科技 - 小程序开发_APP定制_企业建站', keywords: '小程序开发,APP开发,企业网站建设,软件开发,青岛软件公司', description: `汇智云码科技专业提供微信小程序开发、APP定制开发、企业网站建设服务。青岛软件开发公司，120+企业客户，${casesCountText()}成功案例，源码交付终身维护。`, body: homeBody(services, cases, articles, templates), isHome: true, jsonLd: orgJsonLd(info) + websiteJsonLd() + faqJsonLd() + faqSchema([
        ['开发一个项目大概要多少钱？', '价格取决于功能量。官网套餐页面按小程序、APP、网站三大类目给出标准化配置的明码标价，可据此判断区间。定制项目在需求确认后出具逐项报价单，列明每项功能的工时与费用。'],
        ['开发周期多久？', '网站建设 2-6 周，小程序 2-6 周，APP 6-16 周，SaaS 系统 2-6 个月。以上为纯开发时间，不含 ICP 备案与平台审核时间，建议预留 2-4 周缓冲。'],
        ['源码会交付吗？后期维护怎么算？', '源码全部交付，含前后端代码、数据库结构与部署文档。验收后提供 3-12 个月免费维护期，之后可签年度维护协议（通常为建设费用的 15%-20%）或按次付费。'],
        ['外地客户怎么合作？', '公司六成以上客户来自山东省外，合作以线上为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。必要时可安排驻场。'],
        ['需求还没想清楚可以先聊吗？', '可以，需求与方案梳理完全免费，不签约也没有关系。客户最初描述的需求与最终实现功能常有 30%-50% 差异，在写代码前暴露出来能省下大量返工成本。']
      ]) }) },
      { file: 'services.html', html: seoPage('/services', { breadcrumb: [{ name: '开发服务', url: SITE + '/services' }], title: '小程序开发_APP定制_企业建站服务 - 汇智云码', keywords: '小程序开发,APP定制开发,企业网站建设,SaaS开发,软件开发公司', description: '汇智云码科技提供APP定制开发、微信小程序开发、企业网站建设一站式服务，从需求分析到上线运营全程交付，价格透明快速响应。', body: servicesBody(services), jsonLd: faqSchema([['开发周期一般多长？','小程序 2-6 周，APP 6-16 周，网站 2-6 周，SaaS 系统 2-6 个月，具体取决于功能复杂度。以上为纯开发时间，不含 ICP 备案与平台审核，建议预留 2-4 周缓冲。'],['源码是否交付？','所有项目源码全部交付客户，包含前端代码、后端代码、数据库结构与部署文档，不采用只给账号不给源码的托管模式。'],['后期维护费用如何？','交付后提供 3-12 个月免费维护期，期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。之后可按年签维护协议，费用通常为建设费用的 15%-20%。'],['可以先做一部分功能试试吗？','可以。支持分期开发：先交付核心功能上线验证业务模式，跑通后再迭代次要功能，能显著降低前期投入风险。'],['已有系统能二次开发吗？','可以，但需先做代码评估。若原系统技术栈过旧、结构混乱，二次开发成本可能接近重做，我们会如实告知并给出两套方案对比。'],['需求变更怎么处理？','按人天计价：1-2 天工作量的小改动通常免费包含；较大改动或新增模块评估工时后出具增量报价单，确认后执行。所有变更书面记录。'],['你们在青岛，外地客户怎么合作？','公司 60% 以上客户来自山东省外，以线上合作为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发每周同步进度，验收后远程协助部署。']]) + serviceJsonLd('汇智云码科技提供APP定制开发、微信小程序开发、企业网站建设一站式服务，从需求分析到上线运营全程交付，价格透明快速响应。') }) },
      { file: 'cases.html',    html: seoPage('/cases', { breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }], title: '开发案例_小程序APP网站成功案例 - 汇智云码', keywords: '小程序开发案例,APP开发案例,网站建设案例,软件开发案例', description: `汇智云码科技${casesCountText()}成功案例，涵盖微信小程序、APP定制开发、企业网站建设等多个行业，见证真实开发实力。`, body: casesBody(cases), jsonLd: orgJsonLd(info) }) },
      { file: 'about.html',    html: seoPage('/about', { breadcrumb: [{ name: '关于我们', url: SITE + '/about' }], title: '关于汇智云码_青岛专业软件开发公司', keywords: '软件开发公司,APP开发公司,小程序开发公司,汇智云码科技', description: '汇智云码科技是青岛专业软件开发公司，核心团队来自腾讯、阿里、字节，专注小程序开发、企业网站建设、APP定制开发，已服务120+企业客户。', body: aboutBody(info), jsonLd: orgJsonLd(info) }) },
      { file: 'templates.html', html: seoPage('/templates', { breadcrumb: [{ name: '网站模板', url: SITE + '/templates' }], title: '企业网站模板_建站模板_快速建站_汇智云码', keywords: '企业网站模板,建站模板,快速建站,网站模板,企业官网模板', description: '汇智云码科技提供企业官网HTML模板，基础版¥599、专业版¥899、至尊版¥1599，纯源码交付，含在线演示，快速搭建专业企业网站。', body: templatesBody(templates), jsonLd: collectionPageJsonLd("企业网站模板", "汇智云码科技企业官网HTML模板商城，源码交付，含在线演示。") }) },
      { file: 'packages.html', html: seoPage('/packages', { breadcrumb: [{ name: '服务套餐', url: SITE + '/packages' }], title: '软件开发套餐_网站建设小程序APP价格_明码标价_汇智云码', keywords: '软件开发套餐,网站建设价格,小程序开发价格,APP开发价格,建站多少钱', description: '汇智云码科技标准化软件开发套餐：网站建设¥1999起、小程序¥2999起、APP开发¥15999起，按行业配置明码标价，在线直接下单，价格透明，源码交付。', body: packagesBody(packages) }) },
      { file: 'articles.html',  html: seoPage('/articles', { breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }], title: '小程序开发知识_网站建设教程_开发资讯_汇智云码', keywords: '小程序开发知识,网站建设教程,APP开发,软件开发资讯', description: '汇智云码科技分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势，助力企业数字化转型。', body: articlesBody(articles), jsonLd: orgJsonLd(info) }) },
      { file: 'contact.html',   html: seoPage('/contact', { breadcrumb: [{ name: '联系我们', url: SITE + '/contact' }], title: '联系我们_获取开发方案与报价 - 汇智云码', keywords: '软件开发咨询,小程序开发报价,APP开发报价', description: '联系汇智云码科技，获取小程序开发、APP定制开发、企业网站建设报价与方案。电话/微信/在线咨询，快速响应。', body: contactBody(info), jsonLd: localBusinessJsonLd(info) + orgJsonLd(info) }) },
      { file: '404.html',      html: seoPage('/404', { noCanonical: true, title: '页面不存在_汇智云码科技', keywords: '页面不存在,404', description: '您访问的页面不存在或已被移除，请返回首页继续浏览，或查看我们的服务与资讯。', body: '<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>404 - 页面不存在</h1><p>您访问的页面不存在或已被移除。</p><p><a href="' + SITE + '/">返回首页</a> · <a href="' + SITE + '/services">查看服务</a> · <a href="' + SITE + '/articles">浏览资讯</a></p></section>' }) },
    ];

    // 1.5) 【SEO 修复】文章列表分页静态页 /articles/page/N（避免一页渲染全部文章）
    var totalArticlePages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
    for (var ap = 2; ap <= totalArticlePages; ap++) {
      pages.push({
        dir: ['articles', 'page'],
        file: ap + '.html',
        html: seoPage('/articles/page/' + ap, {
          title: '开发资讯与教程_第 ' + ap + ' 页 - 汇智云码',
          keywords: '小程序开发知识,网站建设教程,APP开发,软件开发资讯',
          description: '汇智云码科技分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势，第 ' + ap + ' 页。',
          body: articlesBody(articles, ap),
          robots: 'index,follow',
          breadcrumb: [
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ],
          jsonLd: orgJsonLd(info) + breadcrumbSchema([
            { name: '首页', url: SITE + '/' },
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ])
        })
      });
    }
    if (totalArticlePages > 1) console.log('  - 文章分页静态页：' + (totalArticlePages - 1) + ' 个');

    // 2) 动态详情页（写进 seo/ 子目录，由 nginx 映射）
    const dynamicPages = [];
    for (const c of cases) {
      dynamicPages.push({ dir: ['seo', 'cases'], file: `${c.id}.html`, html: seoPage(`/cases/${c.id}`, { title: `${truncTitle(c.title, 40)}_开发案例_汇智云码`, description: trunc(c.description, 120), body: caseBody(c, cases, solutions),
      breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }, { name: truncTitle(c.title, 30), url: SITE + '/cases/' + c.id }],
      jsonLd: caseJsonLd(c) + (function(){ return ''; })() + breadcrumbSchema([
        { name: '首页', url: SITE + '/' },
        { name: '开发案例', url: SITE + '/cases' },
        { name: truncTitle(c.title, 40), url: SITE + '/cases/' + c.id }
      ]), ogImage: `${SITE}/seo/images/cases/${c.id}.jpg`, ogType: 'article' }) });
    }
    for (const a of articles) {
      dynamicPages.push({ dir: ['seo', 'articles'], file: `${a.id}.html`, html: seoPage(`/articles/${a.id}`, { title: `${truncTitle(a.title, 45)}_汇智云码`, description: trunc(a.summary, 120), body: articleBody(a, articles, cases, solutions),
      breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }, { name: truncTitle(a.title, 30), url: SITE + '/articles/' + a.id }],
      jsonLd: articleJsonLd(a) + breadcrumbSchema([
        { name: '首页', url: SITE + '/' },
        { name: '行业资讯', url: SITE + '/articles' },
        { name: truncTitle(a.title, 40), url: SITE + '/articles/' + a.id }
      ]), ogImage: `${SITE}/seo/images/articles/${a.id}.jpg`, ogType: 'article' }) });
    }

    // Generate SPA pages for main site routes (services, cases, about, templates, packages, contact)
    // Read main index.html template for SPA page generation
    var mainIndex = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
    
    var mainPages = [
      { file: 'services_spa.html', title: '小程序开发_APP定制_企业建站服务 - 汇智云码科技', description: '汇智云码科技提供APP定制开发、微信小程序开发、企业网站建设一站式服务，从需求分析到上线运营全程交付。', keywords: '小程序开发,APP定制开发,企业网站建设,SaaS开发' },
      { file: 'cases_spa.html', title: '小程序开发案例_APP开发案例_网站建设案例 | 汇智云码科技', description: '汇智云码科技200+成功案例，涵盖微信小程序、APP定制开发、企业网站建设等多个行业。', keywords: '小程序开发案例,APP开发案例,网站建设案例,软件开发案例' },
      { file: 'about_spa.html', title: '关于汇智云码_青岛APP开发公司_软件开发公司', description: '汇智云码科技是青岛专业软件开发公司，核心团队来自腾讯、阿里、字节，已服务120+企业客户。', keywords: '青岛软件开发公司,APP开发公司,小程序开发公司,汇智云码科技' },
      { file: 'templates_spa.html', title: '企业网站模板_建站模板_快速建站 | 汇智云码科技', description: '汇智云码科技提供企业官网HTML模板，基础版¥599、专业版¥899，纯源码交付。', keywords: '企业网站模板,建站模板,快速建站,网站模板' },
      { file: 'packages_spa.html', title: '软件开发套餐_网站建设价格_小程序开发报价 | 汇智云码科技', description: '标准化软件开发套餐：网站建设¥1999起、小程序¥2999起、APP开发¥15999起，价格透明。', keywords: '软件开发价格,网站建设报价,小程序开发费用,APP开发多少钱' },
      { file: 'contact_spa.html', title: '联系我们_获取开发方案与报价 - 汇智云码科技', description: '联系汇智云码科技，获取小程序开发、APP定制开发、企业网站建设报价与方案。', keywords: '软件开发咨询,小程序开发报价,APP开发咨询' },
      { file: 'articles_spa.html', title: '小程序开发知识_网站建设教程_开发资讯 | 汇智云码科技', description: '分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势。', keywords: '小程序开发教程,APP开发知识,网站建设教程,软件开发资讯' },
    ];
    for (const mp of mainPages) {
      var mHtml = mainIndex;
      mHtml = mHtml.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(mp.title) + '<\/title>');
      mHtml = mHtml.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(mp.description) + '">');
      mHtml = mHtml.replace(/<meta name="keywords" content="[^"]*">/, '<meta name="keywords" content="' + esc(mp.keywords) + '">');
      mHtml = mHtml.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(mp.title) + '">');
      mHtml = mHtml.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(mp.description) + '">');
      mHtml = mHtml.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://openai2000.cn/' + mp.file.replace('_spa.html', '') + '">');
      mHtml = mHtml.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://openai2000.cn/' + mp.file.replace('_spa.html', '') + '">');
      fs.writeFileSync(path.join(DIST, mp.file), mHtml);
    }
    console.log('  - Main SPA pages: ' + mainPages.length + ' 个');

    // Generate SPA index for each article (correct SEO meta for browsers)
    var articleSpaDir = path.join(DIST, 'articles');
    fs.mkdirSync(articleSpaDir, { recursive: true });
    for (const a of articles) {
      var aHtml = mainIndex;
      aHtml = aHtml.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(a.title) + ' | 汇智云码科技</title>');
      aHtml = aHtml.replace(/<meta name=\"description\" content=\"[^\"]*\">/, '<meta name=\"description\" content=\"' + esc(trunc(a.summary, 150)) + '\">');
      aHtml = aHtml.replace(/<meta name=\"keywords\" content=\"[^\"]*\">/, '<meta name=\"keywords\" content=\"' + esc(a.keywords || a.category + ',' + a.title) + '\">');
      aHtml = aHtml.replace(/<meta property=\"og:title\" content=\"[^\"]*\">/, '<meta property=\"og:title\" content=\"' + esc(a.title) + ' | 汇智云码科技\">');
      aHtml = aHtml.replace(/<meta property=\"og:description\" content=\"[^\"]*\">/, '<meta property=\"og:description\" content=\"' + esc(trunc(a.summary, 150)) + '\">');
      aHtml = aHtml.replace(/<meta property=\"og:url\" content=\"[^\"]*\">/, '<meta property=\"og:url\" content=\"https://openai2000.cn/articles/' + a.id + '\">');
      aHtml = aHtml.replace(/<link rel=\"canonical\" href=\"[^\"]*\">/, '<link rel=\"canonical\" href=\"https://openai2000.cn/articles/' + a.id + '\">');
      var aDir = path.join(articleSpaDir, String(a.id));
      fs.mkdirSync(aDir, { recursive: true });
      fs.writeFileSync(path.join(aDir, 'spa_index.html'), aHtml);
    }
    console.log('  - 文章 SPA 页面：' + articles.length + ' 个');

    // Generate SPA index for each case too
    var caseSpaDir = path.join(DIST, 'cases');
    fs.mkdirSync(caseSpaDir, { recursive: true });
    for (const c of cases) {
      var cHtml = mainIndex;
      cHtml = cHtml.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(c.title) + ' | 汇智云码科技</title>');
      cHtml = cHtml.replace(/<meta name=\"description\" content=\"[^\"]*\">/, '<meta name=\"description\" content=\"' + esc(trunc(c.description, 150)) + '\">');
      cHtml = cHtml.replace(/<meta name=\"keywords\" content=\"[^\"]*\">/, '<meta name=\"keywords\" content=\"' + esc(c.keywords || c.title + ',开发案例') + '\">');
      cHtml = cHtml.replace(/<meta property=\"og:title\" content=\"[^\"]*\">/, '<meta property=\"og:title\" content=\"' + esc(c.title) + ' | 汇智云码科技\">');
      cHtml = cHtml.replace(/<meta property=\"og:description\" content=\"[^\"]*\">/, '<meta property=\"og:description\" content=\"' + esc(trunc(c.description, 150)) + '\">');
      cHtml = cHtml.replace(/<meta property=\"og:url\" content=\"[^\"]*\">/, '<meta property=\"og:url\" content=\"https://openai2000.cn/cases/' + c.id + '\">');
      cHtml = cHtml.replace(/<link rel=\"canonical\" href=\"[^\"]*\">/, '<link rel=\"canonical\" href=\"https://openai2000.cn/cases/' + c.id + '\">');
      var cDir = path.join(caseSpaDir, String(c.id));
      fs.mkdirSync(cDir, { recursive: true });
      fs.writeFileSync(path.join(cDir, 'spa_index.html'), cHtml);
    }
    console.log('  - 案例 SPA 页面：' + cases.length + ' 个');

    // 3.5) City subdomain pages
    var cityDir = path.join(DIST, 'city');
    fs.mkdirSync(cityDir, { recursive: true });
    var cityCount = 0;
    for (var pi = 0; pi < CITIES_DATA.provinces.length; pi++) {
      var prov = CITIES_DATA.provinces[pi];
      for (var ci = 0; ci < prov.cities.length; ci++) {
        var city = prov.cities[ci];
        var cityHtml = seoPage('/', {
          title: city.name + '小程序开发_' + city.name + 'APP定制开发_' + city.name + '企业网站建设_汇智云码科技',
          keywords: city.name + '小程序开发,' + city.name + 'APP开发,' + city.name + '网站建设,' + city.name + '软件开发公司,' + prov.name + '小程序开发',
          description: '汇智云码科技面向' + city.name + '及' + prov.name + '企业提供微信小程序开发、APP定制开发、企业网站建设服务，' + casesCountText() + '成功案例，源码交付终身维护。',
          canonical: 'https://' + city.subdomain + '.openai2000.cn/',
          body: cityBody(city, prov, services, cases),
          jsonLd: orgJsonLd(info),
          robots: isIndexableCity(city.subdomain) ? 'index,follow' : 'noindex,follow',
        });
        fs.writeFileSync(path.join(cityDir, city.subdomain + '.html'), cityHtml);
        cityCount++;
      }
    }

    // 3.5) City subdomain pages (multi-page)
    var cityPageCount = 0;
    for (var pi = 0; pi < CITIES_DATA.provinces.length; pi++) {
      var prov = CITIES_DATA.provinces[pi];
      for (var ci = 0; ci < prov.cities.length; ci++) {
        var city = prov.cities[ci];
        var sd = city.subdomain;
        var cn = city.name;
        var pn = prov.name;
        var cityDir = path.join(DIST, 'city', sd);
        fs.mkdirSync(cityDir, { recursive: true });
        (function(){
        var pcfg = PRIORITY_CITIES[sd];
        var desc = '汇智云码科技面向' + cn + '及' + pn + '企业提供微信小程序开发、APP定制开发、企业网站建设服务，' + casesCountText() + '成功案例，源码交付终身维护。';
        var body = cityHomeBody(cn, services, cases, articles, templates, city, pn);
        var extra = CITY_DEEP[sd] ? cityDeepFaqLd(sd) : (pcfg ? cityLocalBlock(pcfg, cn, pn, sd).faqLd : '');
        fs.writeFileSync(path.join(cityDir, 'index.html'), cityPage(sd, cn, pn, 'index', { title: cn + '小程序开发_企业建站_APP开发 - 汇智云码科技', keywords: cn + '小程序开发,' + cn + 'APP开发,' + cn + '网站建设,' + cn + '软件开发公司,' + pn + '软件开发', description: desc, body: body, jsonLd: orgJsonLd(info) + extra, info: info }));
      })();
        // Generate SPA-compatible index.html for this city
        var spaHtml = generateSpaIndex(path.join(DIST, 'index.html'), cn, sd);
        fs.writeFileSync(path.join(cityDir, 'spa_index.html'), spaHtml);

        fs.writeFileSync(path.join(cityDir, 'services.html'), cityPage(sd, cn, pn, 'services', { title: cn + '服务项目 - 小程序开发_APP开发_网站建设', keywords: cn + '小程序开发,' + cn + 'APP开发,' + cn + '网站建设', description: '汇智云码科技面向' + cn + '客户提供小程序、APP、企业建站一站式数字化解决方案。', body: cityServicesBody(sd, cn, services) }));
        fs.writeFileSync(path.join(cityDir, 'cases.html'), cityPage(sd, cn, pn, 'cases', { title: cn + '开发案例 - 小程序开发_APP开发', keywords: cn + '小程序开发案例,' + cn + 'APP开发案例', description: '汇智云码科技' + casesCountText() + '成功案例。', body: cityCasesBody(sd, cn, cases) }));
        fs.writeFileSync(path.join(cityDir, 'about.html'), cityPage(sd, cn, pn, 'about', { title: cn + '软件开发公司 - 关于汇智云码科技', keywords: cn + '软件开发公司,' + cn + 'APP开发公司', description: '汇智云码科技总部位于山东青岛，面向' + cn + '及' + pn + '提供软件开发服务。', body: cityAboutBody(cn, info) }));
        fs.writeFileSync(path.join(cityDir, 'templates.html'), cityPage(sd, cn, pn, 'templates', { title: cn + '企业网站模板 - 建站模板', keywords: cn + '企业网站模板,' + cn + '建站模板', description: '汇智云码科技面向' + cn + '客户提供企业官网HTML模板，源码交付。', body: cityTemplatesBody(cn, templates) }));
        fs.writeFileSync(path.join(cityDir, 'packages.html'), cityPage(sd, cn, pn, 'packages', { title: cn + '软件开发套餐 - 网站建设价格', keywords: cn + '软件开发套餐,' + cn + '网站建设价格', description: '汇智云码科技面向' + cn + '客户的小程序/APP/建站标准化套餐，明码标价。', body: cityPackagesBody(cn, packages) }));
        fs.writeFileSync(path.join(cityDir, 'articles.html'), cityPage(sd, cn, pn, 'articles', { title: cn + '小程序开发知识 - 资讯', keywords: cn + '小程序开发知识,' + cn + '网站建设教程', description: '汇智云码科技面向' + cn + '客户分享小程序开发、企业建站技术干货与资讯。', body: cityArticlesBody(cn, articles) }));
        fs.writeFileSync(path.join(cityDir, 'contact.html'), cityPage(sd, cn, pn, 'contact', { title: cn + '联系我们 - 小程序开发_APP开发', keywords: cn + '小程序开发,' + cn + 'APP开发,' + cn + '网站建设', description: '联系汇智云码科技，获取面向' + cn + '的小程序/APP/建站开发方案与报价。', body: cityContactBody(cn, info), info: info }));
        cityPageCount++;
      }
    }

    // 3.6) City navigation page
    var cityNavHtml = seoPage('/city', { title: '城市服务导航_小程序开发/APP开发/网站建设_汇智云码科技', keywords: '小程序开发城市,APP开发城市', description: '汇智云码科技覆盖全国300+城市，提供小程序开发、APP定制开发、企业网站建设服务。按城市查找本地服务与报价。', body: cityNavBody(CITIES_DATA.provinces), jsonLd: collectionPageJsonLd('城市服务导航','汇智云码科技全国小程序开发、APP定制开发、企业网站建设城市服务导航') });
    fs.writeFileSync(path.join(DIST, 'city.html'), cityNavHtml);

// 3.1) 行业解决方案页面
    // 3) 收集所有 URL 生成 sitemap
    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact', '/solutions'];
    cases.forEach(c => urls.push(`/cases/${c.id}`));
    articles.forEach(a => urls.push(`/articles/${a.id}`));
    // 【SEO】文章分页 URL 加入 sitemap
    for (var sp = 2; sp <= Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE)); sp++) {
      urls.push('/articles/page/' + sp);
    }
    // 行业解决方案页面（必须在 sitemap 收集前生成）
    console.log("  - 生成行业解决方案页面...");
    const industryUrls = generateIndustryPages(services, cases, info, (typeof articles !== 'undefined' ? articles : []));
    industryUrls.forEach(url => urls.push(url));
    urls.push('/city');
    console.log("  - 行业解决方案页面：" + (industryUrls.length - 1) + " 个");

    // 【SEO 修复】城市子域 URL 不再混入主站 sitemap（sitemap 规范：只含本站 URL）
    // 城市站各自生成独立 sitemap，写入 dist/city/<sd>/sitemap.xml，由各自 robots.txt 声明


    const sitemap = buildSitemap(urls);
    // 同时生成一份 www 主域的（robots 里声明的是 www）
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);

    // 拆分 sitemap：主站 + 文章 + 案例（百度按文件优先级抓取）
    const mainUrls = urls.filter(u => !u.startsWith('/articles/') && !u.startsWith('/cases/'));
    const articleUrls = urls.filter(u => u.startsWith('/articles/'));
    const caseUrls = urls.filter(u => u.startsWith('/cases/'));
    fs.writeFileSync(path.join(DIST, 'sitemap-articles.xml'), buildSitemap(articleUrls));
    fs.writeFileSync(path.join(DIST, 'sitemap-cases.xml'), buildSitemap(caseUrls));

    // 生成 robots.txt（指向真实 sitemap，屏蔽后台）
    fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${SITE}/sitemap.xml\nSitemap: ${SITE}/sitemap-articles.xml\nSitemap: ${SITE}/sitemap-cases.xml\n`);

    // 【SEO 修复】为每个重点城市生成独立 robots.txt + sitemap.xml（城市站自身收录入口）
    (function writeCitySitemaps() {
      var cityPages = ['', 'services', 'cases', 'about', 'templates', 'packages', 'articles', 'contact'];
      var n = 0;
      for (var i = 0; i < CITIES_DATA.provinces.length; i++) {
        var prov = CITIES_DATA.provinces[i];
        for (var j = 0; j < prov.cities.length; j++) {
          var sd = prov.cities[j].subdomain;
          if (!isIndexableCity(sd)) continue;
          var d = path.join(DIST, 'city', sd);
          if (!fs.existsSync(d)) continue;
          var base = 'https://' + sd + '.openai2000.cn';
          var locs = cityPages.map(function (p) { return base + '/' + p; });
          fs.writeFileSync(path.join(d, 'sitemap.xml'), buildSitemap(locs));
          fs.writeFileSync(path.join(d, 'robots.txt'),
            'User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ' + base + '/sitemap.xml\n');
          n++;
        }
      }
      console.log('  - 城市站独立 robots/sitemap：' + n + ' 个');
    })();

    // 4) 写静态页
    const knownNames = new Set(pages.map(p => p.file));
    for (const p of pages) {
      fs.writeFileSync(path.join(DIST, p.file), p.html);
    }

    // 5) 写动态页
    // 静态分页页（dir 为数组时写入子目录）
    for (const pg of pages) {
      if (!pg.dir) continue;
      const dirPath = path.join(DIST, ...pg.dir);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, pg.file), pg.html);
    }

    for (const dp of dynamicPages) {
      const dir = path.join(DIST, ...dp.dir);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, dp.file), dp.html);
    }

    // 6) SEO CSS
    fs.writeFileSync(path.join(DIST, 'seo.css'), SEO_CSS);

    console.log('✅ 生成完成');
    console.log(`   - 静态页：${pages.map(p => p.file).join(', ')}`);
    console.log(`   - 案例页：${cases.length} 个`);
    console.log(`   - 城市子站页面：${cityPageCount} 个城市 x 8 页面`);
    console.log(`   - 文章页：${articles.length} 个`);
    console.log(`   - sitemap URL：${urls.length} 条`);

    // Generate favicon.svg
    var faviconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <rect width="100" height="100" rx="20" fill="#1E40AF"/>\n  <text x="50" y="65" font-size="52" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">汇</text>\n</svg>';
    fs.writeFileSync(path.join(DIST, 'favicon.svg'), faviconSvg);

    // Generate og-cover.png (minimal valid PNG - blue rectangle)
    var zlib = require('zlib');
    function crc32(buf) {
      var table = new Int32Array(256);
      for (var i = 0; i < 256; i++) {
        var c = i;
        for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
      }
      var crc = -1;
      for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
      return (crc ^ (-1)) >>> 0;
    }
    function makeOgPng(w, h) {
      // 【SEO 修复】社交分享与结构化数据要求 1200x630，见下方调用
      function makeChunk(type, data) {
        var buf = Buffer.concat([Buffer.from(type), data]);
        var crcVal = crc32(buf);
        var lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(data.length, 0);
        var crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crcVal, 0);
        return Buffer.concat([lenBuf, buf, crcBuf]);
      }
      var ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(w, 0);
      ihdr.writeUInt32BE(h, 4);
      ihdr[8] = 8; ihdr[9] = 2;
      var raw = [];
      for (var y = 0; y < h; y++) {
        raw.push(0);
        for (var x = 0; x < w; x++) {
          raw.push(30, 64, 175);
        }
      }
      var compressed = zlib.deflateSync(Buffer.from(raw));
      var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
    }
    var ogDir = path.join(DIST, 'seo', 'images');
    fs.mkdirSync(ogDir, { recursive: true });
    fs.writeFileSync(path.join(ogDir, 'og-cover.png'), makeOgPng(1200, 630));

    pool.end();
    payPool.end();
  } catch (e) {
    console.error('❌ 生成失败：', e);
    process.exit(1);
  }
})();

const SEO_CSS = `/* SEO 静态页样式 */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1f2937;line-height:1.7;background:#f9fafb}
a{color:#1e40af;text-decoration:none}
a:hover{text-decoration:underline}
.seo-header{background:#111827;color:#fff;padding:16px 0}
.seo-wrap{max-width:1100px;margin:0 auto;padding:0 20px}
.seo-logo{font-size:20px;font-weight:800;color:#fff}
.seo-nav{margin-top:10px;display:flex;flex-wrap:wrap;gap:16px}
.seo-nav a{color:#d1d5db;font-size:14px}
.seo-main{min-height:60vh}
.seo-hero{background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:56px 20px;text-align:center}
.seo-hero h1{font-size:30px;margin-bottom:14px}
.seo-hero p{max-width:760px;margin:0 auto;opacity:.9}
.seo-section{max-width:1100px;margin:0 auto;padding:36px 20px}
.seo-section h2{font-size:24px;margin-bottom:20px;color:#111827;position:relative}
.seo-page-cover{background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:44px 20px;text-align:center}
.seo-page-cover h1{font-size:28px;margin-bottom:12px}
.seo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.seo-card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px}
.seo-card h3{font-size:17px;margin-bottom:8px}
.seo-card p{font-size:14px;color:#4b5563}
.seo-card-img{width:100%;height:auto;border-radius:8px;margin-bottom:14px;display:block}
.seo-case-img{width:100%;max-width:900px;height:auto;border-radius:12px;margin:0 auto 24px;display:block;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.seo-meta{color:#6b7280;font-size:13px}
.seo-price{color:#dc2626;font-weight:600}
.seo-price strong{font-size:18px}
.seo-content{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:28px}
.seo-content p{margin-bottom:14px}
.seo-breadcrumb{max-width:1100px;margin:0 auto;padding:18px 20px 0;font-size:13px;color:#6b7280}
.seo-breadcrumb a{color:#1d4ed8}
.seo-footer{background:#111827;color:#9ca3af;padding:28px 0;text-align:center;font-size:13px;margin-top:40px}
.seo-footer a{color:#d1d5db}
.city-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}

`;

// ---------- 行业解决方案页面生成 ----------
function industryBody(industry, services, cases, articles) {
  const name = industry.name;
  const slug = industry.slug;
  const keywords = industry.keywords;
  const desc = industry.description;
  const relatedServices = industry.services;
  
  // 筛选相关案例
  const relatedCases = cases.filter(c => {
    const text = (c.title + ' ' + (c.description || '') + ' ' + (c.category || '')).toLowerCase();
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  }).slice(0, 6);
  
  const svcs = relatedServices.map(s => 
    '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>' + esc(s) + '</h3><p>专业' + name + '行业数字化解决方案，助力企业转型升级。</p></article>'
  ).join('\n');
  
  const cHtml = relatedCases.map(c => 
    '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3><a href="' + SITE + '/cases/' + c.id + '">' + esc(c.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(c.client || '') + '</p><p>' + esc(trunc(c.description, 100)) + '</p></article>'
  ).join('\n');
  
  const parts = [];
  parts.push('<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;">');
  parts.push('  <h1>' + name + '行业解决方案 - 小程序/APP/网站开发</h1>');
  parts.push('  <p>汇智云码科技为' + name + '行业提供专业的数字化解决方案，' + desc + '</p>');
  parts.push('  <p style="margin-top:18px;"><a href="' + SITE + '/contact" style="display:inline-block;padding:10px 24px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">获取' + name + '行业方案</a></p>');
  parts.push('</section>');
  
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>' + name + '行业核心服务</h2>');
  parts.push('  <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">');
  parts.push('    ' + svcs);
  parts.push('  </div>');
  parts.push('</section>');
  
  if (relatedCases.length > 0) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
    parts.push('  <h2>' + name + '行业成功案例</h2>');
    parts.push('  ' + cHtml);
    parts.push('</section>');
  }
  
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>为什么选择汇智云码？</h2>');
  parts.push('  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">');
  parts.push('    <p>汇智云码科技深耕' + name + '行业数字化转型，拥有丰富的行业经验和成功案例。我们理解' + name + '行业的特殊需求，提供从需求分析到上线运营的一站式服务。</p>');
  parts.push('    <p>我们的优势：行业经验丰富、技术架构先进、源码交付、终身维护、价格透明。</p>');
  parts.push('  </div>');
  parts.push('</section>');
  
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">');
  parts.push('  <h2>获取' + name + '行业方案</h2>');
  parts.push('  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;text-align:center;">');
  parts.push('    <p>如果您需要' + name + '行业的数字化解决方案，欢迎联系我们获取专属方案和报价。</p>');
  parts.push('    <p><a href="' + SITE + '/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">立即咨询</a></p>');
  parts.push('  </div>');
  parts.push('</section>');

  // ========== 【SEO 扩写】行业深度内容 + 内链建设 ==========
  var _S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  var _H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  var _H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  var ex = (typeof INDUSTRY_EXTRA !== 'undefined' && INDUSTRY_EXTRA[slug]) ? INDUSTRY_EXTRA[slug] : {};

  if (ex.pain && ex.pain.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业普遍面临的数字化痛点</h2>');
    parts.push('    <p>在服务' + name + '行业客户的过程中，我们发现大家遇到的困难高度相似，主要集中在以下几个方面：</p>');
    parts.push('    <ul style="line-height:2;">' + ex.pain.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>');
    parts.push('    <p>这些问题的共同点是：<strong>不是缺人，而是缺工具</strong>。把重复性的记录、通知、统计工作交给系统，团队才能把精力放在真正需要人的判断上。</p>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  if (ex.modules && ex.modules.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业系统核心功能模块</h2>');
    parts.push('    <p>下面按模块说明每项功能解决的具体问题，方便你判断哪些是当前阶段真正需要的：</p>');
    ex.modules.forEach(function (m, i) {
      parts.push('    <h3 ' + _H3 + '>' + (i + 1) + '. ' + m[0] + '</h3>');
      parts.push('    <p>' + m[1] + '</p>');
    });
    parts.push('    <p style="margin-top:20px;">需要说明的是，上面列的是' + name + '行业的常见功能集合，<strong>不代表每家企业都需要全部实现</strong>。实际项目中我们通常会按必需、重要、可延后三档给功能做优先级排序，先上线核心功能验证业务，再按实际使用情况迭代。</p>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  if (ex.scenes && ex.scenes.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业典型应用场景</h2>');
    parts.push('    <ul style="line-height:2;">' + ex.scenes.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
  parts.push('  <div class="content" ' + _S + '>');
  parts.push('    <h2 ' + _H2 + '>' + name + '行业项目的实施流程</h2>');
  parts.push('    <p><strong>第一步 · 业务调研（2-5 个工作日）</strong><br>' + name + '行业的业务逻辑往往包含大量隐性规则，这些规则通常只存在于老员工的脑子里。我们会安排有' + name + '行业项目经验的成员做调研，把隐性规则显性化，形成书面需求文档供双方确认。</p>');
  parts.push('    <p><strong>第二步 · 功能分级与方案确定（2-3 个工作日）</strong><br>把需求拆成功能清单，按必需、重要、可延后分级，给出对应的开发周期与报价。这一阶段的结果是你拿到一份能看懂的方案，而不是一堆技术名词。</p>');
  parts.push('    <p><strong>第三步 · 原型与设计（5-10 个工作日）</strong><br>输出页面原型图与设计稿。' + name + '行业的操作场景常在移动端，我们会重点验证实际操作路径是否顺畅，而不是只看视觉是否好看。</p>');
  parts.push('    <p><strong>第四步 · 开发与联调（按功能量，通常 4-12 周）</strong><br>前后端并行开发，每周同步进度。涉及第三方系统对接（支付、地图、硬件设备、平台接口）的部分，我们会提前做接口可行性验证，避免开发到后期才发现走不通。</p>');
  parts.push('    <p><strong>第五步 · 测试与试运行（1-2 周）</strong><br>功能测试通过后，建议先在部分门店或部分业务线试运行，收集真实使用反馈再做调整，最后全面上线。这一步看似多余，但能大幅降低全面上线后出现问题的风险。</p>');
  parts.push('    <p><strong>第六步 · 上线与迭代（长期）</strong><br>协助完成部署、备案与平台审核，交付源码与文档。上线后按实际使用数据持续迭代。</p>');
  parts.push('  </div>');
  parts.push('</section>');

  if (ex.faq && ex.faq.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业常见问题</h2>');
    ex.faq.forEach(function (q) {
      parts.push('    <h3 ' + _H3 + '>' + q[0] + '</h3>');
      parts.push('    <p>' + q[1] + '</p>');
    });
    parts.push('  </div>');
    parts.push('</section>');
  }

  // 内链建设：指向服务/套餐/案例/其他行业
  var links = [];
  links.push('<li><a href="' + SITE + '/services">' + name + '行业适用的开发服务总览</a></li>');
  links.push('<li><a href="' + SITE + '/packages">' + name + '行业标准化套餐与明码标价</a></li>');
  links.push('<li><a href="' + SITE + '/cases">查看我们交付的行业开发案例</a></li>');
  links.push('<li><a href="' + SITE + '/solutions">全部 14 个行业解决方案</a></li>');
  (ex.related || []).forEach(function (s) {
    var o = INDUSTRIES.filter(function (i) { return i.slug === s; })[0];
    if (o) links.push('<li><a href="' + SITE + '/solutions/' + o.slug + '">' + o.name + '行业解决方案</a></li>');
  });
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
  parts.push('  <div class="content" ' + _S + '>');
  parts.push('    <h2 ' + _H2 + '>相关服务与方案</h2>');
  parts.push('    <ul style="line-height:2;">' + links.join('') + '</ul>');
  parts.push('  </div>');
  parts.push('</section>');

  // 内链：相关文章
  var relArts = [];
  if (typeof articles !== 'undefined' && articles && articles.length) {
    relArts = articles.filter(function (a) {
      var t = String((a.title || '') + ' ' + (a.category || '') + ' ' + (a.summary || '')).toLowerCase();
      return keywords.some(function (k) { return t.indexOf(String(k).toLowerCase()) >= 0; });
    }).slice(0, 5);
  }
  if (relArts.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>延伸阅读：' + name + '行业相关文章</h2>');
    parts.push('    <ul style="line-height:2;">' + relArts.map(function (a) {
      return '<li><a href="' + SITE + '/articles/' + a.id + '">' + esc(a.title) + '</a></li>';
    }).join('') + '</ul>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  return parts.join('\n');
}

// ---------- 行业扩展数据（痛点 / 场景 / 功能模块 / 常见问题 / 关联行业）----------
// 【SEO 扩写】为 14 个行业页提供差异化正文，避免页面间内容雷同
const INDUSTRY_EXTRA = {
  catering: {
    pain: [
      '高峰时段点餐效率低，顾客排队流失，收银台与后厨沟通靠喊，出错率高',
      '依赖第三方外卖平台，佣金抽成逐年上涨，到手利润被持续挤压，且拿不到顾客真实联系方式',
      '会员体系形同虚设，储值卡、优惠券靠纸质登记，无法沉淀复购数据，营销活动只能凭感觉做',
      '多门店经营时库存与采购各自为政，原料积压与临时缺货同时存在，损耗无法量化'
    ],
    scenes: ['顾客到店扫码点餐、自助结算', '自营外卖小程序下单与配送调度', '门店会员储值与营销活动投放', '连锁多门店统一菜单、库存与经营看板'],
    modules: [
      ['扫码点餐', '顾客扫桌码自助点餐、加菜、催单、买单，订单实时同步后厨与收银，减少服务员往返与口头传菜'],
      ['自营外卖', '搭建自有外卖入口，支持起送价、配送范围、配送费规则配置，订单直连后厨与骑手，摆脱平台高佣金'],
      ['会员储值与营销', '支持储值卡、次卡、积分、优惠券、生日券等玩法，消费数据自动沉淀，可按消费频次与金额分层投放活动'],
      ['库存与采购', '原料入库、出库、盘点全流程记录，设置安全库存自动提醒补货，配合菜品配方可反算原料消耗'],
      ['多门店管理', '总部统一维护菜单与价格，各门店独立管理库存与订单，经营数据实时汇总到总部看板'],
      ['后厨 KDS', '订单自动分发到对应档口，出餐状态可视化，减少漏单与错单，高峰期效率明显提升']
    ],
    faq: [
      ['扫码点餐小程序需要顾客下载 APP 吗？', '不需要。扫码点餐基于微信小程序实现，顾客扫码即用，无需下载安装。这也是小程序在餐饮场景普及率远高于 APP 的核心原因。'],
      ['能对接现有的收银系统或外卖平台吗？', '可以对接，前提是对方提供开放接口。美团、饿了么等平台的部分数据接口需要商家具备相应的商户资质才能开通，具体可行性我们在需求阶段会做技术评估后明确答复。'],
      ['连锁门店的价格可以不一样吗？', '可以。系统支持总部统一价与门店独立价两种模式，也可以按区域或门店类型做差异化配置。']
    ],
    related: ['retail', 'hotel', 'tourism']
  },
  retail: {
    pain: [
      '流量被电商平台垄断，平台内竞价成本越来越高，自有客户资产几乎为零',
      '线下门店客流持续下滑，导购与顾客之间缺乏可持续的连接方式，人走客走',
      '商品、库存、订单分散在多个渠道，超卖与积压并存，财务对账耗时费力',
      '想做分销裂变却缺乏工具支撑，佣金结算靠手工表格，规模一大就出错'
    ],
    scenes: ['微信商城小程序承接私域流量', '社区团购与到店自提', '多级分销裂变与佣金结算', '门店导购数字化与客户资产管理'],
    modules: [
      ['微信商城小程序', '商品展示、购物车、下单支付、订单追踪全流程闭环，支持多规格商品、限时折扣、满减、拼团等常见营销形态'],
      ['分销裂变', '支持设置分销层级、佣金比例与结算规则，推广员通过专属海报或链接获客，佣金自动计算并可提现'],
      ['库存同步', '线上商城与线下门店共用一套库存数据，下单即锁库存，避免超卖；支持多仓库与调拨管理'],
      ['会员与积分', '会员等级、积分累积与兑换、消费记录一体化，配合优惠券与储值卡提升复购'],
      ['导购助手', '导购可生成专属推广链接与海报，客户归属与业绩自动统计，把门店导购变成线上获客入口'],
      ['经营数据看板', '销售、库存、会员、渠道效果集中呈现，帮助经营者判断哪些商品该补货、哪些活动值得持续投入']
    ],
    faq: [
      ['小程序商城和淘宝店有什么区别？', '最大的区别是客户资产归属。淘宝店的客户数据归平台，你只能看到订单；小程序商城的客户数据完全归你自己，可以反复触达、沉淀私域。两者不冲突，很多客户的做法是平台店负责拉新，小程序负责复购。'],
      ['分销会不会有法律风险？', '分销本身合法，风险点在层级与计酬方式。我们默认按合规的二级分销以内设计，避免触碰传销红线，具体模式建议在需求阶段与企业法务或专业人士确认。'],
      ['能对接现有的 ERP 或进销存系统吗？', '可以，只要对方提供 API 接口。对接范围通常包括商品同步、库存同步、订单回传，具体方案需要评估对方接口能力后确定。']
    ],
    related: ['catering', 'beauty', 'logistics']
  },
  education: {
    pain: [
      '招生获客依赖地推与转介绍，成本逐年上升，线索散落在各个顾问的微信里无法沉淀',
      '课程排期、学员分班、老师课表靠 Excel 维护，一改就乱，调课通知靠群里刷屏',
      '续费提醒全靠人工记忆，学员课时用完才想起来联系，续费率无法提升',
      '线上教学缺自有工具，直播依赖第三方平台，无法沉淀自己的学员数据'
    ],
    scenes: ['课程展示与在线报名', '直播与录播教学', '学员档案与课时管理', '续费提醒与老带新招生'],
    modules: [
      ['课程管理', '课程分类、班期排期、课时安排、教师分配统一在后台维护，排课冲突自动提示'],
      ['直播与录播', '支持直播授课、录播回放、课件上传与作业布置，学员在小程序内即可完成学习，无需跳转第三方平台'],
      ['学员档案', '记录学员基础信息、报名课程、剩余课时、学习进度与测评成绩，形成完整学习轨迹'],
      ['作业与测评', '在线布置作业、学员提交、教师批改，支持选择题自动判分与错题统计'],
      ['续费提醒', '按剩余课时设置自动提醒节点，推送给学员与顾问，把续费从被动等待变成主动触达'],
      ['招生分销', '老学员生成专属推荐码，新学员报名后自动计算奖励，把口碑转介绍变成可管理的渠道']
    ],
    faq: [
      ['小程序能承载直播教学吗？', '可以，但需要说明的是直播对音视频稳定性要求高，我们通常采用微信官方 live-player 组件或接入合规的第三方音视频服务。大班课与一对一场景的技术方案不同，需要按实际规模选型。'],
      ['学员信息涉及未成年人，数据合规怎么办？', '涉及未成年人的信息属于敏感个人信息，需要单独同意并严格限制使用范围。我们在系统设计上支持数据分级、权限隔离与操作日志留痕，但合规责任主体仍是教育机构本身，建议在项目启动前与法务确认信息收集范围。'],
      ['能对接现有的 CRM 或招生系统吗？', '可以，前提是对方提供接口。常见的对接内容包括线索同步、报名信息回传、订单与支付结果同步。']
    ],
    related: ['medical', 'beauty', 'retail']
  },
  medical: {
    pain: [
      '患者到院排队挂号、缴费、取报告，等候时间长，体验差，投诉集中在这几个环节',
      '患者随访依赖医生手动打电话，工作量大且容易遗漏，慢病管理与术后康复难以持续',
      '纸质病历与检查报告分散保存，调阅困难，复诊时医生无法快速掌握既往情况',
      '复诊率与患者依从性偏低，缺乏有效的提醒与沟通渠道'
    ],
    scenes: ['线上预约挂号与分时段就诊', '在线问诊与复诊续方（合规前提下）', '电子健康档案与报告查询', '慢病随访与用药提醒'],
    modules: [
      ['预约挂号', '按科室、医生、时段展示号源，患者线上选号并支付挂号费，减少现场排队；支持退号改约规则配置'],
      ['在线问诊', '提供图文与视频问诊通道，医患沟通记录留存可查。需要说明的是，互联网诊疗服务需符合国家相关管理办法，涉及处方开具的场景必须依托具备资质的实体医疗机构'],
      ['电子病历与档案', '患者既往就诊记录、检查报告、用药史集中归集，医生在授权范围内可快速调阅'],
      ['报告查询', '检验检查报告出具后自动推送给患者，支持在线查看与下载，减少往返取单'],
      ['随访与用药提醒', '按病种设置随访计划，到点自动推送随访问卷或用药提醒，患者反馈结果汇总给医护团队'],
      ['健康管理', '记录血压、血糖等日常指标，形成趋势曲线，便于慢病患者的长期自我管理与医生随访参考']
    ],
    faq: [
      ['做在线问诊需要什么资质？', '互联网诊疗属于受严格监管的领域。根据现行规定，开展互联网诊疗服务需要依托取得《医疗机构执业许可证》的实体医疗机构，并在相应平台完成备案。软件开发本身不等于具备诊疗资质，这一点必须在项目启动前明确。'],
      ['系统能开具电子处方吗？', '电子处方的开具与流转涉及处方审核、药师签名、医保结算等多个监管环节，必须由具备资质的医疗机构在其合规的互联网医院体系内完成。我们可以在对方已具备资质与合规系统对接能力的前提下做界面层与数据层对接。'],
      ['患者数据如何保证安全？', '医疗健康数据属于敏感个人信息，我们按最小必要原则收集，在传输层强制 HTTPS，存储层做敏感字段加密，并支持访问权限分级与操作日志留痕。'],
      ['能对接医院的 HIS 或 LIS 系统吗？', '技术上可以对接，但医院内部系统通常有严格的网络隔离与接口管控，需要院方信息科配合并走内部审批流程。这类对接的推进速度往往取决于院方，而非技术本身。']
    ],
    related: ['education', 'housekeeping', 'hotel']
  },
  realestate: {
    pain: [
      '房源信息散落在各经纪人的手机与表格里，重复房源多，客户看到的信息长期不更新',
      '带看靠电话反复沟通时间，经纪人一天能带看的组数有限，效率难以提升',
      '客户跟进记录缺失，意向客户交接到另一位经纪人手里就断了线，成交机会流失',
      'VR 看房制作成本高、周期长，中小机构难以规模化使用'
    ],
    scenes: ['楼盘与房源在线展示', 'VR 全景看房', '经纪人房源管理与客户跟进', '在线预约带看'],
    modules: [
      ['楼盘与房源展示', '楼盘的区位、户型、配套、价格、销控状态集中展示，房源信息一处修改全渠道同步，避免过期信息误导客户'],
      ['VR 全景看房', '支持接入全景拍摄内容，客户在手机上即可 360 度查看户型空间，减少无效带看，把经纪人时间集中在高意向客户上'],
      ['房源管理', '房源录入、核验、上架、下架全流程留痕，支持按小区、户型、价格、面积多维度检索与筛选'],
      ['客户 CRM', '客户来源、需求画像、跟进记录、意向等级统一管理，交接时历史记录完整移交，避免客户流失'],
      ['带看预约', '客户在线选择时间并预约，系统同步给对应经纪人，减少电话来回确认的时间成本'],
      ['佣金与业绩', '成交归属、佣金分配、业绩排名自动统计，多经纪协作的场景下分配规则可配置']
    ],
    faq: [
      ['VR 看房需要自己拍摄吗？', '需要。全景内容通常由专业全景相机拍摄，我们负责的是内容的承载、展示与交互。如果你的团队已有拍摄能力，可以直接上传；如果没有，可以委托第三方拍摄团队完成后再接入系统。'],
      ['房源数据能自动同步到其他平台吗？', '可以对接开放了数据接口的平台，但主流房产平台对房源数据的接入通常有资质与审核要求，且不允许直接搬运。实际可行范围需按平台规则评估。'],
      ['小程序和 APP 哪个更适合房产中介？', '多数中小机构选小程序，因为客户不需要下载、扫码即看，传播成本低。如果经纪人数量多、需要大量离线上门作业与消息推送，则 APP 更适合。']
    ],
    related: ['hotel', 'automotive', 'retail']
  },
  automotive: {
    pain: [
      '门店集客依赖平台导流，线索成本高，且平台把客户联系方式截留，到店转化难以追踪',
      '保养到期提醒靠人工翻记录，客户保养周期被遗忘，售后产值流失到路边店',
      '维修预约没有线上入口，客户到店才知道要排队，客户体验与工位效率双输',
      '车主缺乏与门店的持续连接，做完一次保养就断联，无法形成长期客户关系'
    ],
    scenes: ['4S店与维修厂集客', '维修保养在线预约', '二手车交易信息展示', '车主会员与售后运营'],
    modules: [
      ['门店集客小程序', '门店信息、服务项目、优惠活动统一展示，客户留资后线索直接进入门店 CRM，不经过第三方平台截流'],
      ['保养提醒', '按车型与上次保养时间自动推算下次保养节点，到点推送提醒，把售后被动等客变成主动召回'],
      ['维修预约', '客户在线选择服务项目与到店时间，门店提前排工位与配件，减少客户等待与工位空转'],
      ['二手车商城', '车辆信息、实拍图、检测报告、价格集中展示，支持在线咨询与预约看车'],
      ['车主会员', '会员等级、积分、专属权益一体化，维修消费累积积分，提升客户留存与复购'],
      ['线索与工单管理', '从线索到成交到售后服务的全流程记录，每个客户的服务历史可追溯']
    ],
    faq: [
      ['能对接 4S 店现有的 DMS 系统吗？', '可以，前提是 DMS 厂商开放接口。部分厂商的接口需要走授权流程并可能产生费用，这一点需要在项目评估阶段先与 DMS 厂商确认。'],
      ['保养提醒的数据从哪来？', '需要门店提供客户的历史保养记录作为初始数据，之后的记录由系统在使用过程中持续累积。如果历史数据只存在纸质单据上，需要先做一次数据整理录入。'],
      ['二手车商适合做小程序吗？', '适合。二手车客户决策周期长、比价频繁，小程序可以反复触达、持续更新车源，比一次性投放广告更划算。']
    ],
    related: ['logistics', 'realestate', 'manufacturing']
  },
  tourism: {
    pain: [
      '景区导览依赖纸质地图和指示牌，游客体验单一，二次消费转化难',
      '门票分销渠道多而杂，价格体系混乱，景区难以掌握真实的渠道效果',
      '行程规划靠游客自己查攻略，缺乏本地化的推荐工具，游客在景区内停留时间短',
      '淡旺季流量差异大，旺季接待能力不足、淡季资源闲置，缺乏调节手段'
    ],
    scenes: ['景区语音导览与智慧游园', '门票与套票在线预订', '跟团游与自由行行程规划', '民宿与周边住宿预订'],
    modules: [
      ['景区语音导览', '游客到达景点自动或手动触发语音讲解，支持多种语言与多条讲解路线，替代纸质导览与人工讲解'],
      ['门票预订', '支持单票、套票、组合票，可配置分时段预约与实名制，闸机核销对接需按景区现有设备情况评估'],
      ['行程规划', '按天数、主题、预算生成推荐行程，游客可自行调整并保存，把碎片化的攻略变成可执行的产品'],
      ['住宿预订', '民宿与酒店房态、价格、图片统一展示，支持在线预订与订单管理，降低对 OTA 平台的依赖'],
      ['分销渠道管理', '为旅行社、企业团建、OTA 等渠道分配独立推广码与结算规则，渠道效果可量化'],
      ['游客评价与反馈', '游览结束后推送评价入口，差评自动提醒运营方介入，把投诉处理提前到口碑受损之前']
    ],
    faq: [
      ['语音导览需要自己录制吗？', '需要。讲解词的内容创作与录音通常由景区或专业内容团队完成，我们负责把音频与地理位置绑定并实现触发逻辑。'],
      ['景区闸机核销能对接吗？', '取决于闸机厂商是否开放接口。主流的智慧景区闸机厂商大多支持接口对接，但也存在部分老旧设备无法联网的情况，需要实地评估。'],
      ['小程序和公众号哪个更适合景区？', '两者通常配合使用：公众号负责内容触达与活动推送，小程序负责导览、预订等重交互功能。只做一个会损失一部分能力。']
    ],
    related: ['hotel', 'catering', 'logistics']
  },
  hotel: {
    pain: [
      '订单高度依赖 OTA 平台，佣金抽成高，且平台限制酒店直接触达已预订客人',
      '直销渠道占比低，官网老旧或无预订功能，客人想直接订房找不到入口',
      '房态与价格靠前台表格管理，多渠道销售时容易超售或价格冲突',
      '会员体系缺失，住客離店即断联，缺乏复购与口碑沉淀的抓手'
    ],
    scenes: ['酒店官网与小程序直销预订', '房态与价格统一管理', '会员体系与常客运营', '智能门锁与自助入住'],
    modules: [
      ['直销预订系统', '酒店在小程序与官网提供直订入口，展示房型、图片、设施与实时房价，订单直达前台，省去平台佣金'],
      ['房态管理', '各渠道房量统一在一处维护，售出即扣减，避免超售；支持按日期批量设置价格与库存'],
      ['会员体系', '注册会员、累积间夜与积分、会员专属价、生日礼遇，把一次性住客转化为可复购的会员'],
      ['在线支付与担保', '支持在线预付、到店支付、担保预订等多种模式，按酒店实际政策配置取消规则'],
      ['智能门锁对接', '在门锁厂商开放接口的前提下支持手机开门与自助入住，减少前台排队'],
      ['经营看板', '入住率、平均房价、渠道占比、会员贡献集中呈现，辅助定价与渠道策略调整']
    ],
    faq: [
      ['直销能替代 OTA 吗？', '多数酒店做不到完全替代，也不需要。更现实的目标是把直销占比从个位数逐步提升，让 OTA 回归"拉新渠道"而非"唯一客源"，从而改善整体佣金结构。'],
      ['能对接携程、美团的房态吗？', '可以对接开放了接口的渠道，通常通过渠道直连服务商（如部分 PMS 厂商提供的直连服务）实现房态与订单同步。渠道端的接入权限与费用需要单独确认。'],
      ['民宿只有几间房也需要系统吗？', '如果只有 1-2 间房，用平台工具可能更划算。当房间数达到 5 间以上、或有多渠道售卖需求时，自建系统在佣金节省与管理效率上的收益才会明显体现。']
    ],
    related: ['tourism', 'realestate', 'catering']
  },
  beauty: {
    pain: [
      '顾客预约靠微信私聊或电话，前台同时应对多台手机，冲突与遗漏时有发生',
      '技师排班靠纸质表格，临时调班通知不到位，到店才发现人手不足',
      '会员卡、次卡、储值余额分散记录，顾客问余额时前台要翻半天，体验差',
      '耗材与产品库存不明，顾客到店才发现某个项目用不了'
    ],
    scenes: ['顾客在线预约选技师选项目', '技师排班与工位管理', '会员卡储值与消费记录', '耗材库存与员工提成'],
    modules: [
      ['在线预约', '顾客在小程序选择项目、技师与到店时间，实时显示可约时段，避免重复预约；支持到店提醒与改约'],
      ['技师排班', '按技师设置可服务时段与擅长项目，系统自动避开已占用时间，临时调整实时生效'],
      ['会员卡管理', '储值卡、次卡、套餐卡统一管理，余额与剩余次数实时可查，消费自动扣减并推送通知给顾客'],
      ['耗材与产品库存', '项目与耗材用量关联，服务完成后自动扣减库存，低于安全库存自动提醒补货'],
      ['员工提成', '按项目、按业绩设置提成规则，服务完成自动计算，减少月底手工核算的争议'],
      ['评价与回流', '服务完成后推送评价，好评可用于展示，差评提醒店长及时介入；配合生日券与沉睡唤醒提升回店率']
    ],
    faq: [
      ['顾客不用小程序怎么办？', '门店场景下小程序的接受度普遍较高，因为只有预约和查余额两个动作，扫码即用。对于确实不方便使用的顾客，前台可在后台代客预约，两套入口可以并存。'],
      ['能同时管理多家门店吗？', '可以。支持总部统一管理项目、价格与会员权益，各门店独立管理排班与库存，会员可在连锁门店间通用消费。'],
      ['储值卡涉及资金监管吗？', '单用途商业预付卡的发行在部分地区有备案与资金管理要求，具体是否适用取决于你的经营模式与所在地规定。我们提供系统工具，合规义务由经营者承担，建议咨询当地商务主管部门。']
    ],
    related: ['housekeeping', 'education', 'retail']
  },
  housekeeping: {
    pain: [
      '订单派单靠人工在群里发消息，抢单混乱，距离与技能匹配全凭感觉',
      '服务人员流动性大，档案与培训记录不完整，客户指定的阿姨离职后服务质量断层',
      '服务质量缺乏统一标准与记录，客户投诉时难以追溯过程',
      '客户对上门服务的安全顾虑大，缺乏可信的信任背书机制'
    ],
    scenes: ['客户在线下单与指定服务', '智能派单与人员调度', '服务人员档案与培训管理', '服务评价与质量追溯'],
    modules: [
      ['在线下单', '客户选择服务类型、时长、上门时间与地址，系统按区域展示可接单人员与价格'],
      ['智能派单', '按服务人员位置、技能标签、历史评分与排班情况推荐匹配人选，支持系统派单与人员抢单两种模式'],
      ['服务人员档案', '身份证、健康证、技能证书、培训记录统一归档，到期证件自动提醒更新，避免带证过期上岗'],
      ['服务过程记录', '上门打卡、服务前后拍照、项目清单确认，形成可追溯的服务过程记录，纠纷时有据可依'],
      ['服务评价', '客户对服务人员评分与评价，评分与派单优先级、结算挂钩，形成正向激励'],
      ['保险与保障', '支持对接第三方保险产品，为每次上门服务投保，作为对客户与从业者的双向保障']
    ],
    faq: [
      ['服务人员不会用 APP 怎么办？', '可以考虑简化端。家政从业人员年龄跨度大，我们通常把服务人员端做成极简界面——只有接单、打卡、上传照片三个核心动作，并提供大字号与语音提示。'],
      ['客户隐私和人身安全如何保障？', '系统层面可以做身份证实名核验、健康证上传留存、服务过程记录与行程分享。这些是技术手段能覆盖的部分；从业人员的背景核验、上门安全规范等则需要企业管理制度的配合，不能只靠系统。'],
      ['能对接现有的家政平台吗？', '多数家政平台不开放对外接口，客户数据也难以导出。如果已在平台有存量客户，通常是先并行运营，逐步把复购客户引导到自有小程序。']
    ],
    related: ['beauty', 'medical', 'catering']
  },
  wedding: {
    pain: [
      '档期管理靠纸质日历，销售与执行两头登记，撞档期的风险始终存在',
      '案例作品散落在员工手机与朋友圈，客户想看完整案例只能靠销售一张张发图',
      '婚礼筹备周期长、沟通节点多，客户跟到一半失联，销售无法判断该跟谁',
      '套餐报价靠口头报，客户比价时说不清差价在哪里，成交转化低'
    ],
    scenes: ['婚礼案例与作品展示', '档期日历与预约管理', '客户跟进与筹备进度管理', '套餐报价与电子合同'],
    modules: [
      ['案例作品库', '按风格、场地、预算分类展示完整案例，含实拍图与视频，客户可自行浏览收藏，减少销售重复发图的工作量'],
      ['档期日历', '摄影师、司仪、场地、化妆师等资源档期集中管理，下单即锁定，从根本上杜绝撞档'],
      ['在线预约', '客户在线选择服务项目与意向日期并提交预约，销售按顺序跟进，避免多个销售同时联系同一客户'],
      ['套餐报价', '把服务内容拆解为可勾选的模块，客户按需组合并即时看到价格，报价透明化反而提升转化'],
      ['客户跟进', '记录客户婚期、预算、沟通节点与意向等级，按婚期倒推跟进计划，避免长时间失联导致客户流失'],
      ['电子合同与订单', '在线签约，服务清单与付款节点明确列出，双方各持一份，减少后期争议']
    ],
    faq: [
      ['婚礼客户决策周期长，系统有用吗？', '恰恰因为周期长才更需要系统。婚礼客户从咨询到下定通常间隔数月，销售同时跟进几十组客户，没有记录工具必然漏跟。系统解决的是"记得住 + 跟得上"的问题。'],
      ['能整合摄影摄像的成片交付吗？', '可以。系统支持上传成片供客户在线查看与下载，并可设置下载权限与有效期。大体积视频文件的存储与带宽成本需要单独评估。'],
      ['婚庆小程序和大众点评有什么区别？', '点评是公域流量入口，客户在平台上比价，你和其他商家站在同一起跑线；小程序是私域，展示的是你完整的案例与专业度，客户不容易在浏览过程中被竞品广告带走。']
    ],
    related: ['hotel', 'tourism', 'beauty']
  },
  logistics: {
    pain: [
      '客户查询运单进度靠打电话，客服被重复问题占满，真正需要处理的问题反而被耽误',
      '车队调度靠调度员经验与电话沟通，车辆空驶率高，运力利用不充分',
      '仓储依靠纸质单据，账实不符时有发生，盘点一次要停业半天',
      '代收货款与运费结算金额大、笔数多，手工对账风险高'
    ],
    scenes: ['运单全程可视化追踪', '车队调度与司机管理', '仓储出入库管理', '货主端与司机端协同'],
    modules: [
      ['运单追踪', '货主在小程序输入单号即可查看实时状态与轨迹，减少客服重复查询；状态变更自动推送通知'],
      ['车队调度', '车辆位置、载重、司机排班与在途任务集中呈现，支持智能配载与回程货源匹配，降低空驶'],
      ['仓储管理', '入库、上架、拣货、出库全流程扫码记录，库存实时准确，支持多仓库与库位管理'],
      ['货主小程序', '货主在线下单、查询运单、下载对账单与电子回单，把线下沟通搬到线上'],
      ['司机端应用', '司机接单、导航、上传签收凭证、申请费用报销，减少调度员的中间协调工作'],
      ['运费与结算', '运费自动计算、代收货款记录、对账单自动生成，大幅减少财务手工核对的工作量']
    ],
    faq: [
      ['运单轨迹数据从哪来？', '通常需要对接第三方位置服务，或由司机端在运输过程中上报位置。如果承运车辆已装有 GPS 设备且厂商开放接口，也可以直接对接设备数据。'],
      ['能对接快递平台或电商平台的订单吗？', '可以对接开放接口的平台。主流电商平台的订单接口通常需要具备相应服务商资质才能开通，这一点需要在项目评估阶段先确认。'],
      ['货主为什么愿意用小程度查询？', '因为打电话问客服的体验更差——占线、需要报单号、客服还要去查。小程序自助查询即时返回结果，省掉双方的时间，这是货主最直接的收益。']
    ],
    related: ['manufacturing', 'agriculture', 'automotive']
  },
  agriculture: {
    pain: [
      '消费者对农产品来源缺乏信任，"是不是真的产地直发"无法自证',
      '销售渠道单一，依赖批发商与收购商，价格话语权完全在买方手里',
      '种植管理靠经验与记忆，施肥用药记录不完整，出问题时无法回溯',
      '订单、物流、结算分散在多个环节，账目不清，规模扩大后管理混乱'
    ],
    scenes: ['农产品一物一码溯源', '产地直发电商平台', '种植档案与农事记录', '供应链与政府监管数据对接'],
    modules: [
      ['一物一码溯源', '为每批产品生成独立溯源码，消费者扫码即可查看产地、种植记录、采收时间与检测报告，把信任建立在可验证的信息上'],
      ['农产品商城', '产地直发商城，支持按规格与产地下单，配合预售与拼团玩法消化集中采收期的产能'],
      ['种植档案', '按地块记录播种、施肥、灌溉、采收等农事操作，形成完整生产记录，既是管理依据也是溯源数据源'],
      ['农事提醒', '按作物生长周期推送关键农事节点提醒，把老农经验固化为可执行的日程，降低对个人经验的依赖'],
      ['供应链协同', '从产地到仓储到配送的环节状态可查，订单与库存数据打通，减少信息不对称导致的损耗'],
      ['渠道分销', '为合作社成员、代理商分配独立推广与结算规则，订单归因清晰，结算不再靠手工统计']
    ],
    faq: [
      ['溯源信息会不会被造假？', '技术层面能做的是记录不可篡改与操作留痕——一旦写入便难以静默修改，修改会留下记录。但溯源数据的真实性最终取决于数据录入环节的责任人，系统无法替代管理。这一点必须如实说明。'],
      ['合作社多个农户共用一个系统可行吗？', '可行。系统支持按农户或地块划分数据权限，各自维护自己的生产记录，合作社在管理端汇总查看，数据互不干扰。'],
      ['能用小程序做农产品销售吗？', '可以，而且很适合。农产品客单价低、复购稳定，小程序即用即走的特性比 APP 更适合这个品类，配合社区团购与预售模式效果更明显。']
    ],
    related: ['logistics', 'retail', 'manufacturing']
  },
  manufacturing: {
    pain: [
      '生产进度不透明，销售问交期只能去车间跑一趟，客户催单时答复不确定',
      '设备台账与点检记录靠纸质表单，维保到期容易遗漏，突发停机影响交付',
      '质量问题追溯困难，出了批次问题无法快速定位是哪道工序、哪批原料',
      '与上下游供应商的协同靠电话与邮件，订单变更传递滞后，物料到货与排产脱节'
    ],
    scenes: ['生产排程与工单管理', '设备台账与点检维保', '质量追溯与批次管理', '供应链协同与车间看板'],
    modules: [
      ['生产排程', '按订单交期、设备产能与物料到位情况排产，工单下发到工序，生产进度实时反馈，销售可自助查询交期'],
      ['工单管理', '工单从创建、派工、报工到完工全流程记录，每道工序的完成时间与责任人可追溯'],
      ['设备管理', '设备台账、点检计划、维保记录一体化，点检到期自动提醒，减少非计划停机'],
      ['质量追溯', '按批次记录原料来源、工序参数与检验结果，出现质量问题时可按批次快速定位影响范围'],
      ['供应链协同', '向供应商开放订单与交期查看权限，物料到货状态与排产计划联动，减少因物料延误导致的停工'],
      ['车间看板', '在车间部署可视化看板，实时显示工单进度、设备状态与异常预警，让现场问题第一时间被看见']
    ],
    faq: [
      ['能对接现有的 ERP 吗？', '可以，前提是 ERP 厂商开放接口。常见的对接内容包括订单、物料、库存与成本的同步。部分老旧的本地部署 ERP 需要厂商配合开发接口，会产生额外费用与工期，这一点在评估阶段要先确认。'],
      ['车间设备数据能自动采集吗？', '取决于设备是否支持联网与数据输出。新设备通常具备 PLC 或数据接口，可以通过网关采集；老旧设备可能需要加装传感器或采用人工报工方式过渡。这类改造的可行性与成本必须实地评估，我们不会在没有现场勘察的情况下承诺。'],
      ['小工厂值得上系统吗？', '建议先看痛点。如果目前靠 Excel 和微信群就能把订单交付管清楚，上系统反而增加负担。当出现"交期答不准、质量追不到、库存对不上"这三类问题时，投入系统才有明确回报。']
    ],
    related: ['logistics', 'agriculture', 'automotive']
  }
};

// 行业数据定义
const INDUSTRIES = [
  {
    name: '餐饮',
    slug: 'catering',
    keywords: ['餐饮', '点餐', '外卖', '扫码点餐', '餐厅'],
    description: '扫码点餐小程序、外卖配送系统、会员管理、库存管理等数字化解决方案。',
    services: ['扫码点餐小程序', '外卖配送系统', '会员营销系统', '库存管理系统']
  },
  {
    name: '零售',
    slug: 'retail',
    keywords: ['零售', '商城', '电商', '分销', '购物'],
    description: '微信商城小程序、分销裂变系统、库存管理、会员营销等数字化解决方案。',
    services: ['微信商城小程序', '分销裂变系统', '库存管理系统', '会员营销系统']
  },
  {
    name: '教育',
    slug: 'education',
    keywords: ['教育', '培训', '在线教育', '知识付费', '课程'],
    description: '在线教育平台、知识付费系统、课程管理系统、学员管理系统等数字化解决方案。',
    services: ['在线教育平台', '知识付费系统', '课程管理系统', '学员管理系统']
  },
  {
    name: '医疗',
    slug: 'medical',
    keywords: ['医疗', '健康', '医院', '诊所', '预约挂号'],
    description: '预约挂号系统、健康管理平台、在线问诊系统、患者管理系统等数字化解决方案。',
    services: ['预约挂号系统', '健康管理平台', '在线问诊系统', '患者管理系统']
  },
  {
    name: '房产',
    slug: 'realestate',
    keywords: ['房产', '楼盘', '中介', '二手房', '新房'],
    description: '楼盘展示系统、VR看房、房产中介管理系统、预约看房等数字化解决方案。',
    services: ['楼盘展示系统', 'VR看房系统', '中介管理系统', '预约看房系统']
  },
  {
    name: '汽车',
    slug: 'automotive',
    keywords: ['汽车', '4S店', '二手车', '维修', '保养'],
    description: '4S店管理系统、二手车交易平台、维修保养预约、车主会员系统等数字化解决方案。',
    services: ['4S店管理系统', '二手车交易平台', '维修保养预约', '车主会员系统']
  },
  {
    name: '旅游',
    slug: 'tourism',
    keywords: ['旅游', '景区', '酒店', '民宿', '行程'],
    description: '景区导览系统、酒店预订平台、行程规划系统、门票预订等数字化解决方案。',
    services: ['景区导览系统', '酒店预订平台', '行程规划系统', '门票预订系统']
  },
  {
    name: '酒店',
    slug: 'hotel',
    keywords: ['酒店', '民宿', '预订', '住宿'],
    description: '酒店预订系统、客房管理系统、会员管理系统、在线支付等数字化解决方案。',
    services: ['酒店预订系统', '客房管理系统', '会员管理系统', '在线支付系统']
  },
  {
    name: '美业',
    slug: 'beauty',
    keywords: ['美业', '美容', '美发', '美甲', 'SPA'],
    description: '预约管理系统、会员营销系统、员工管理系统、库存管理系统等数字化解决方案。',
    services: ['预约管理系统', '会员营销系统', '员工管理系统', '库存管理系统']
  },
  {
    name: '家政',
    slug: 'housekeeping',
    keywords: ['家政', '保洁', '保姆', '月嫂', '维修'],
    description: '服务预约系统、人员调度系统、订单管理系统、会员管理系统等数字化解决方案。',
    services: ['服务预约系统', '人员调度系统', '订单管理系统', '会员管理系统']
  },
  {
    name: '婚庆',
    slug: 'wedding',
    keywords: ['婚庆', '婚纱', '摄影', '婚礼策划'],
    description: '场地预约系统、案例展示系统、客户管理系统、在线支付等数字化解决方案。',
    services: ['场地预约系统', '案例展示系统', '客户管理系统', '在线支付系统']
  },
  {
    name: '物流',
    slug: 'logistics',
    keywords: ['物流', '快递', '货运', '仓储'],
    description: '运单跟踪系统、车队管理系统、仓储管理系统、客户管理系统等数字化解决方案。',
    services: ['运单跟踪系统', '车队管理系统', '仓储管理系统', '客户管理系统']
  },
  {
    name: '农业',
    slug: 'agriculture',
    keywords: ['农业', '农产品', '溯源', '种植', '养殖'],
    description: '农产品溯源系统、电商平台、种植管理系统、供应链管理等数字化解决方案。',
    services: ['农产品溯源系统', '电商平台', '种植管理系统', '供应链管理系统']
  },
  {
    name: '制造业',
    slug: 'manufacturing',
    keywords: ['制造', '工厂', '生产', '设备', '供应链'],
    description: '设备管理系统、生产管理系统、供应链管理系统、质量追溯系统等数字化解决方案。',
    services: ['设备管理系统', '生产管理系统', '供应链管理系统', '质量追溯系统']
  }
];

// 生成行业解决方案页面
function generateIndustryPages(services, cases, info, articles) {
  const outDir = path.join(DIST, 'solutions');
  fs.mkdirSync(outDir, { recursive: true });
  
  const industryUrls = [];
  
  INDUSTRIES.forEach(ind => {
    const html = seoPage('/solutions/' + ind.slug, {
      title: ind.name + '行业解决方案 - 小程序/APP/网站开发 - 汇智云码',
      keywords: ind.name + '小程序开发,' + ind.name + 'APP开发,' + ind.name + '网站开发,' + ind.name + '行业数字化',
      description: '汇智云码科技为' + ind.name + '行业提供专业的数字化解决方案，' + ind.description,
      canonical: SITE + '/solutions/' + ind.slug,
      body: industryBody(ind, services, cases, articles),
      breadcrumb: [{ name: '行业解决方案', url: SITE + '/solutions' }, { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }],
      jsonLd: orgJsonLd(info) + '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"' + ind.name + '行业解决方案","description":"' + ind.description + '","provider":{"@type":"Organization","name":"汇智云码科技"}}</script>'
        + faqSchema((INDUSTRY_EXTRA[ind.slug] && INDUSTRY_EXTRA[ind.slug].faq) ? INDUSTRY_EXTRA[ind.slug].faq : [])
        + breadcrumbSchema([
            { name: '首页', url: SITE + '/' },
            { name: '行业解决方案', url: SITE + '/solutions' },
            { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }
          ])
    });
    
    fs.writeFileSync(path.join(outDir, ind.slug + '.html'), html);
    industryUrls.push('/solutions/' + ind.slug);
    console.log('   - 生成行业解决方案: solutions/' + ind.slug + '.html');
  });
  
  // 生成行业导航页
  const _S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const _H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const _H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  const navHtml = '<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;"><h1>行业解决方案 - 数字化转型</h1><p>汇智云码科技为 14 个行业提供专业的数字化解决方案，均为源码交付、终身维护。</p></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;">' +
    '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' +
    INDUSTRIES.map(ind => '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SITE + '/solutions/' + ind.slug + '">' + ind.name + '行业解决方案</a></h3><p>' + ind.description + '</p></article>').join('\n') +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>为什么按行业提供方案，而不是卖通用产品？</h2>' +
    '<p>同一个功能需求，在不同行业里的实现方式差异远比想象中大。以"预约"这个看起来最通用的功能为例：</p>' +
    '<p><strong>美业门店的预约</strong>核心是技师排班与工位占用，顾客要指定熟悉的技师，系统必须能避开已被占用的时段；<strong>医院的预约挂号</strong>核心是号源分配与科室分流，需要分时段、限号数、支持退号改约；<strong>家政的预约</strong>核心是人员调度，要考虑服务人员的地理位置、技能标签与在途时间；<strong>婚庆的预约</strong>核心其实是档期锁定，摄影师、司仪、场地的档期不能撞车。</p>' +
    '<p>如果把上面这些塞进一套通用系统，结果必然是一个什么都能做、但什么都不好用的产品。所以我们的做法是：<strong>先按行业沉淀出经过验证的功能集合与业务规则，再在此基础上做企业个性化调整</strong>。这样既避免了从零设计带来的试错成本，又保留了适配具体业务的灵活度。</p>' +
    '<p>如果你所在的行业不在下面这 14 个之列，也没关系——我们的能力底座是通用的开发能力，行业方案只是加快沟通效率的起点，不是可选范围的边界。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>行业方案怎么选：先看痛点，不看功能清单</h2>' +
    '<p>我们建议客户在选择方案时，先不要看功能列表，而是先回答三个问题：</p>' +
    '<p><strong>第一个问题：现在最让你头疼的是什么？</strong>是客户留不住、是内部协作乱、还是账目对不上？把最痛的那一个问题写下来，围绕它选功能。很多企业上系统的失败原因不是功能不够，而是一下子上太多，员工用不过来，最后全都闲置。</p>' +
    '<p><strong>第二个问题：谁会用这个系统？</strong>是终端客户、是门店员工、还是总部管理者？不同角色的使用意愿差异极大。面向客户的功能要考虑"扫码即用、三步完成"，面向员工的功能要考虑"能不能减少他们的工作量"——如果新系统让员工的工作变多而不是变少，推行必然失败。</p>' +
    '<p><strong>第三个问题：能接受多长的上线周期？</strong>如果业务等不起，就应该先做能快速上线的核心模块，其余延后。我们发现很多项目之所以失控，是因为把 6 个月的功能量压进 2 个月的工期，结果要么延期，要么质量打折。</p>' +
    '<p>把这三个问题想清楚，再看行业页面里的功能模块列表，就能快速判断哪些是必需的、哪些可以放到第二阶段。如果拿不准，<a href="' + SITE + '/contact">联系我们</a>，我们会免费帮你做一轮需求梳理。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>各行业常见项目的周期与投入参考</h2>' +
    '<p>下表是基于我们实际交付经验的大致区间，仅作预算与排期参考。真实报价必须基于具体功能清单评估，不同企业的功能量差异可能达到数倍。</p>' +
    '<p><strong>餐饮 · 扫码点餐 + 会员营销</strong>：3-6 周，属于功能边界清晰、可标准化程度高的品类，是小程序最典型也最容易见效的场景。</p>' +
    '<p><strong>零售 · 商城 + 分销裂变</strong>：5-10 周，涉及订单、库存、佣金结算多条链路，商品规格与营销玩法的复杂度是工期的主要变量。</p>' +
    '<p><strong>教育 · 课程 + 学员 + 直播</strong>：6-12 周，直播模块的技术方案选择（自研 vs 接入第三方）会显著影响工期与成本。</p>' +
    '<p><strong>医疗 · 预约挂号 + 报告查询</strong>：6-12 周，工期很大程度上取决于能否对接医院内部系统，院方信息科的配合进度往往是关键路径。</p>' +
    '<p><strong>房产 · 房源 + VR 看房 + 客户管理</strong>：6-12 周，VR 内容的拍摄制作需要单独安排时间，与软件开发可以并行。</p>' +
    '<p><strong>物流 · 运单跟踪 + 车队调度</strong>：8-16 周，是 14 个行业中复杂度较高的一类，涉及实时位置、多端协同与复杂结算逻辑。</p>' +
    '<p><strong>制造 · 生产排程 + 设备管理 + 质量追溯</strong>：8-20 周，通常需要与现有 ERP 对接，老旧设备的联网改造也需要实地勘察，是周期最长、最需要谨慎评估的品类。</p>' +
    '<p>比较简单的品类（如企业展示型网站、基础预约系统）通常在 2-4 周内即可完成。如果你需要更精确的评估，把功能和期望上线时间告诉我们，我们可以给出针对性的排期建议。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;"><div class="content" ' + _S + ' style="text-align:center;">' +
    '<h2 ' + _H2 + '>相关服务与资源</h2>' +
    '<p><a href="' + SITE + '/services">全部开发服务详解</a> ｜ <a href="' + SITE + '/packages">明码标价开发套餐</a> ｜ <a href="' + SITE + '/cases">交付案例</a> ｜ <a href="' + SITE + '/templates">网站模板商城</a> ｜ <a href="' + SITE + '/articles">行业技术文章</a></p>' +
    '<p style="margin-top:24px;"><a href="' + SITE + '/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取行业方案与报价</a></p>' +
    '</div></section>';
  
  const navPage = seoPage('/solutions', {
    title: '行业解决方案 - 数字化转型 - 汇智云码科技',
    keywords: '行业解决方案,数字化转型,小程序开发,APP开发',
    description: '汇智云码科技为餐饮、零售、教育、医疗等14个行业提供专业的数字化解决方案。',
    canonical: SITE + '/solutions',
    body: navHtml,
    jsonLd: breadcrumbSchema([
      { name: '首页', url: SITE + '/' },
      { name: '行业解决方案', url: SITE + '/solutions' }
    ])
  });
  
  fs.writeFileSync(path.join(outDir, 'index.html'), navPage);
  industryUrls.push('/solutions');
  console.log('   - 生成行业导航页: solutions/index.html');
  
  return industryUrls;
}

// ---------- HowTo Schema 生成 ----------
function howToSchema(title, steps) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.content
    }))
  }) + '</script>';
}

// 检测是否为教程类文章
function isTutorialArticle(title) {
  const tutorialKeywords = ['流程', '步骤', '教程', '指南', '怎么做', '如何', '开发', '搭建', '配置', '部署'];
  return tutorialKeywords.some(kw => title.includes(kw));
}

// 从文章内容提取步骤
function extractSteps(content) {
  const steps = [];
  const lines = content.split('\n');
  let currentStep = null;
  
  lines.forEach(line => {
    const match = line.match(/^[一二三四五六七八九十]+[、.]|^\d+[、.]|第[一二三四五六七八九十]+步/);
    if (match) {
      if (currentStep) steps.push(currentStep);
      currentStep = { title: line.trim(), content: '' };
    } else if (currentStep && line.trim()) {
      currentStep.content += line.trim() + ' ';
    }
  });
  
  if (currentStep) steps.push(currentStep);
  return steps.length >= 2 ? steps : null;
}

// ---------- FAQPage 结构化数据（AI 搜索 / 富媒体结果友好） ----------
function faqSchema(items) {
  if (!items || !items.length) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(function (it) {
      return { '@type': 'Question', name: it[0], acceptedAnswer: { '@type': 'Answer', text: it[1] } };
    })
  }) + '</script>';
}

// ---------- 面包屑 Schema 生成 ----------
function breadcrumbSchema(items) {
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url
    }))
  }) + '</script>';
}

// ---------- 客户评价模块 ----------
function reviewSection(caseData) {
  return `
  <section class="reviews" style="margin-top:40px;">
    <h2>客户评价</h2>
    <div class="review-card" style="background:#f8fafc;padding:24px;border-radius:12px;margin:16px 0;">
      <div class="stars" style="color:#f59e0b;font-size:24px;">★★★★★</div>
      <p style="margin:12px 0;font-size:16px;line-height:1.8;">
        "与汇智云码合作非常愉快，开发周期短、质量高、售后响应快。强烈推荐！"
      </p>
      <p style="color:#6b7280;">—— ${esc(caseData.client || '客户')} 项目负责人</p>
    </div>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "${esc(caseData.title)}",
      "review": {
        "@type": "Review",
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
        "author": { "@type": "Person", "name": "${esc(caseData.client || '客户')}" }
      }
    }
    </script>
  </section>`;
}

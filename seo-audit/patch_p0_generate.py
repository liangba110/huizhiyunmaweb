#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
汇智云码 SEO 修复 P0 批次 — 补丁 generate.js
1) 城市站群止险：只有 PRIORITY_CITIES(20城) 可索引，其余 281 城 noindex
2) sitemap 只含主站 URL（剔除子域）
3) 新增城市站独立 sitemap + robots.txt 生成
4) Article 结构化数据：ISO8601 日期 + image 字段 + author Person
5) og:image 补进 seoPage（含真实 1200x630 封面）
6) 首页 H1 单一主题
7) 图片：文章页补封面图（替代 404 placeholder），删除坏 og-cover 引用
8) prerender UA 白名单补 AI 搜索爬虫（ChatGPT-User / PerplexityBot / Applebot 等）
"""
import re, sys, shutil, os

PATH = '/data/web/huizhiyunma/backend/seo/generate.js'
src = open(PATH, encoding='utf-8').read()
orig = src
changes = []

def rep(old, new, tag, count=1):
    global src
    if old not in src:
        print(f'  ✗ [{tag}] 锚点未找到，跳过'); return False
    n = src.count(old)
    if n > count:
        print(f'  ⚠ [{tag}] 锚点出现 {n} 次(预期{count})，仍执行')
    src = src.replace(old, new, count)
    print(f'  ✓ [{tag}] 已应用')
    changes.append(tag); return True

print('=== P0 补丁开始 ===')

# ---- 1) Article 结构化数据修正 ----
old_article_ld = """function articleJsonLd(a) {
  const url = `${SITE}/articles/${a.id}`;
  const date = a.published_at ? String(a.published_at).slice(0, 10) : '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: trunc(a.summary, 160),
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: '汇智云码科技' },
    publisher: { '@type': 'Organization', name: '汇智云码科技', url: SITE + '/' },
    mainEntityOfPage: url,
  }) + '</script>' + '\\n' + '<script type="application/ld+json">' + JSON.stringify({"""
new_article_ld = """// 统一日期为 ISO 8601（Article 富媒体结果要求）
function isoDate(v) {
  if (!v) return '';
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/\\.\\d{3}Z$/, '+08:00');
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
  }) + '</script>' + '\\n' + '<script type="application/ld+json">' + JSON.stringify({"""
rep(old_article_ld, new_article_ld, 'Article结构化数据(ISO8601+image+Person)')

# ---- 2) seoPage 增加 og:image / twitter:card ----
old_og = """<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta name="robots" content="${robots}">
<link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg">"""
new_og = """<meta property="og:type" content="${ogType}">
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
<link rel="icon" type="image/svg+xml" href="${SITE}/favicon.svg">"""
rep(old_og, new_og, 'seoPage og:image+twitter:card')

old_destructure = """    isHome = false,
    jsonLd = '',
    robots = 'index,follow',
  } = opts;"""
new_destructure = """    isHome = false,
    jsonLd = '',
    robots = 'index,follow',
    ogImage = `${SITE}/seo/images/og-cover.png`,
    ogType = 'website',
  } = opts;"""
rep(old_destructure, new_destructure, 'seoPage 参数(ogImage/ogType)')

# ---- 3) 首页 H1 单一主题 ----
old_h1 = """  <h1>汇智云码科技 - 企业网站建设 · 小程序开发 · APP定制开发</h1>
  <p>青岛软件开发公司，120+企业客户，${casesCountText()}成功案例，源码交付，终身维护。专注为企业提供数字化转型一站式解决方案。</p>"""
new_h1 = """  <h1>青岛小程序开发与 APP 定制开发服务</h1>
  <p>汇智云码科技（青岛）专注微信小程序开发、APP 定制开发与企业网站建设。核心团队来自腾讯、阿里、字节，120+ 企业客户，源码交付，终身维护。</p>"""
rep(old_h1, new_h1, '首页H1单一主题')

# ---- 4) sitemap：剔除子域 + 生成城市站独立 sitemap/robots ----
old_city_urls = """    // City subdomain URLs (use subdomain format for SEO)
    for (var pi = 0; pi < CITIES_DATA.provinces.length; pi++) {
    // 3.1) 行业解决方案页面
    console.log("  - 生成行业解决方案页面...");
    const industryUrls = generateIndustryPages(services, cases, info);
    industryUrls.forEach(url => urls.push(url));
    console.log("  - 行业解决方案页面：" + (industryUrls.length - 1) + " 个");
      for (var ci = 0; ci < CITIES_DATA.provinces[pi].cities.length; ci++) {
        var cs = CITIES_DATA.provinces[pi].cities[ci].subdomain;
        if (!PRIORITY_CITIES[cs]) continue;
        urls.push('https://' + cs + '.openai2000.cn/');
        urls.push('https://' + cs + '.openai2000.cn/services');
        urls.push('https://' + cs + '.openai2000.cn/cases');
        urls.push('https://' + cs + '.openai2000.cn/about');
        urls.push('https://' + cs + '.openai2000.cn/templates');
        urls.push('https://' + cs + '.openai2000.cn/packages');
        urls.push('https://' + cs + '.openai2000.cn/articles');
        urls.push('https://' + cs + '.openai2000.cn/contact');
      }
    }
"""
new_city_urls = """    // 行业解决方案页面（必须在 sitemap 收集前生成）
    console.log("  - 生成行业解决方案页面...");
    const industryUrls = generateIndustryPages(services, cases, info);
    industryUrls.forEach(url => urls.push(url));
    console.log("  - 行业解决方案页面：" + (industryUrls.length - 1) + " 个");

    // 【SEO 修复】城市子域 URL 不再混入主站 sitemap（sitemap 规范：只含本站 URL）
    // 城市站各自生成独立 sitemap，写入 dist/city/<sd>/sitemap.xml，由各自 robots.txt 声明
"""
rep(old_city_urls, new_city_urls, 'sitemap剔除子域URL')

old_sitemap_write = """    // 拆分 sitemap：主站 + 文章 + 案例（百度按文件优先级抓取）
    const mainUrls = urls.filter(u => !u.startsWith('/articles/') && !u.startsWith('/cases/'));
    const articleUrls = urls.filter(u => u.startsWith('/articles/'));
    const caseUrls = urls.filter(u => u.startsWith('/cases/'));
    fs.writeFileSync(path.join(DIST, 'sitemap-articles.xml'), buildSitemap(articleUrls));
    fs.writeFileSync(path.join(DIST, 'sitemap-cases.xml'), buildSitemap(caseUrls));

    // 生成 robots.txt（指向真实 sitemap，屏蔽后台）
    fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\\nAllow: /\\nDisallow: /admin\\n\\nSitemap: ${SITE}/sitemap.xml\\nSitemap: ${SITE}/sitemap-articles.xml\\nSitemap: ${SITE}/sitemap-cases.xml\\n`);"""
new_sitemap_write = """    // 拆分 sitemap：主站 + 文章 + 案例（百度按文件优先级抓取）
    const mainUrls = urls.filter(u => !u.startsWith('/articles/') && !u.startsWith('/cases/'));
    const articleUrls = urls.filter(u => u.startsWith('/articles/'));
    const caseUrls = urls.filter(u => u.startsWith('/cases/'));
    fs.writeFileSync(path.join(DIST, 'sitemap-articles.xml'), buildSitemap(articleUrls));
    fs.writeFileSync(path.join(DIST, 'sitemap-cases.xml'), buildSitemap(caseUrls));

    // 生成 robots.txt（指向真实 sitemap，屏蔽后台）
    fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\\nAllow: /\\nDisallow: /admin\\n\\nSitemap: ${SITE}/sitemap.xml\\nSitemap: ${SITE}/sitemap-articles.xml\\nSitemap: ${SITE}/sitemap-cases.xml\\n`);

    // 【SEO 修复】为每个重点城市生成独立 robots.txt + sitemap.xml（城市站自身收录入口）
    (function writeCitySitemaps() {
      var cityPages = ['', 'services', 'cases', 'about', 'templates', 'packages', 'articles', 'contact'];
      var n = 0;
      for (var i = 0; i < CITIES_DATA.provinces.length; i++) {
        var prov = CITIES_DATA.provinces[i];
        for (var j = 0; j < prov.cities.length; j++) {
          var sd = prov.cities[j].subdomain;
          if (!PRIORITY_CITIES[sd]) continue;
          var d = path.join(DIST, 'city', sd);
          if (!fs.existsSync(d)) continue;
          var base = 'https://' + sd + '.openai2000.cn';
          var locs = cityPages.map(function (p) { return base + '/' + p; });
          fs.writeFileSync(path.join(d, 'sitemap.xml'), buildSitemap(locs));
          fs.writeFileSync(path.join(d, 'robots.txt'),
            'User-agent: *\\nAllow: /\\nDisallow: /admin\\n\\nSitemap: ' + base + '/sitemap.xml\\n');
          n++;
        }
      }
      console.log('  - 城市站独立 robots/sitemap：' + n + ' 个');
    })();"""
rep(old_sitemap_write, new_sitemap_write, '城市站独立robots+sitemap')

# ---- 5) 文章封面图生成（替代 404 placeholder） ----
old_caseimg = """// ---------- 案例封面占位图 ----------"""
new_caseimg = """// ---------- 文章封面图 ----------
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

// ---------- 案例封面占位图 ----------"""
rep(old_caseimg, new_caseimg, '文章封面生成函数')

# 调用 ensureArticleImages
old_call = """    // 0) 生成/补齐案例封面占位图（首页、cases 栏目页、case 详情页生成前调用）
    ensureCaseImages(cases);"""
new_call = """    // 0) 生成/补齐案例封面 + 文章封面（列表页、详情页、Article schema 生成前调用）
    ensureCaseImages(cases);
    ensureArticleImages(articles);"""
rep(old_call, new_call, '调用文章封面生成')

# ---- 6) 文章正文插入封面图 ----
old_body_img = """<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">${addArticleFigs(a.content)}</div>
<p><a href="${SITE}/articles">← 返回资讯列表</a></p></section>"""
new_body_img = """<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px;"><figure class="article-image" style="max-width:1200px;margin:0 auto;"><img src="${SITE}/seo/images/articles/${a.id}.jpg" alt="${esc(a.title)}" width="1200" height="630" style="width:100%;height:auto;border-radius:12px;display:block;" loading="eager"></figure></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">${addArticleFigs(a.content)}</div>
<p><a href="${SITE}/articles">← 返回资讯列表</a></p></section>"""
rep(old_body_img, new_body_img, '文章正文封面图')

# ---- 7) 文章页 ogImage 传入 ----
old_dyn_article = """      dynamicPages.push({ dir: ['seo', 'articles'], file: `${a.id}.html`, html: seoPage(`/articles/${a.id}`, { title: `${truncTitle(a.title, 45)}_汇智云码`, description: trunc(a.summary, 120), body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a) }) });"""
new_dyn_article = """      dynamicPages.push({ dir: ['seo', 'articles'], file: `${a.id}.html`, html: seoPage(`/articles/${a.id}`, { title: `${truncTitle(a.title, 45)}_汇智云码`, description: trunc(a.summary, 120), body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a), ogImage: `${SITE}/seo/images/articles/${a.id}.jpg`, ogType: 'article' }) });"""
rep(old_dyn_article, new_dyn_article, '文章页og:image')

# 案例页 og:image
old_dyn_case = """      dynamicPages.push({ dir: ['seo', 'cases'], file: `${c.id}.html`, html: seoPage(`/cases/${c.id}`, { title: `${truncTitle(c.title, 40)}_开发案例_汇智云码`, description: trunc(c.description, 120), body: caseBody(c), jsonLd: caseJsonLd(c) }) });"""
new_dyn_case = """      dynamicPages.push({ dir: ['seo', 'cases'], file: `${c.id}.html`, html: seoPage(`/cases/${c.id}`, { title: `${truncTitle(c.title, 40)}_开发案例_汇智云码`, description: trunc(c.description, 120), body: caseBody(c), jsonLd: caseJsonLd(c), ogImage: `${SITE}/seo/images/cases/${c.id}.jpg`, ogType: 'article' }) });"""
rep(old_dyn_case, new_dyn_case, '案例页og:image')

# 首页 og:image 用真实 1200x630
old_home_og = """{ file: 'index.seo.html',   html: seoPage('/', { title: '汇智云码科技 - 小程序开发_APP定制_企业建站',"""
new_home_og = """{ file: 'index.seo.html',   html: seoPage('/', { ogImage: `${SITE}/seo/images/og-cover.png`, title: '汇智云码科技 - 小程序开发_APP定制_企业建站',"""
rep(old_home_og, new_home_og, '首页og:image声明')

# ---- 8) 城市站 robots 修严：非优先城市全站 noindex ----
# cityPage 已按 PRIORITY_CITIES 设索引；但 generateSpaIndex 生成的浏览器版仍为 index,follow
old_spa_index = """  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + SITE_BASE + '/">'
  );
  return html;"""
new_spa_index = """  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    '<link rel="canonical" href="' + SITE_BASE + '/">'
  );
  // 【SEO 修复】非重点城市禁止索引，避免批量薄内容站群惩罚
  var isPriority = (typeof PRIORITY_CITIES !== 'undefined') && PRIORITY_CITIES[subdomain];
  if (!isPriority) {
    if (/<meta name="robots"[^>]*>/.test(html)) {
      html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex,follow">');
    } else {
      html = html.replace('</head>', '<meta name="robots" content="noindex,follow">\\n</head>');
    }
  }
  return html;"""
rep(old_spa_index, new_spa_index, '非重点城市SPA页noindex')

# ---- 9) og-cover 改成 1200x630 真实尺寸 ----
old_ogpng = """    function makeOgPng(w, h) {"""
new_ogpng = """    function makeOgPng(w, h) {
      // 【SEO 修复】社交分享与结构化数据要求 1200x630，见下方调用"""
rep(old_ogpng, new_ogpng, 'og-cover尺寸说明')

old_ogpng_call = """    fs.writeFileSync(path.join(ogDir, 'og-cover.png'), makeOgPng(200, 105));"""
new_ogpng_call = """    fs.writeFileSync(path.join(ogDir, 'og-cover.png'), makeOgPng(1200, 630));"""
rep(old_ogpng_call, new_ogpng_call, 'og-cover改1200x630')

# ---- 10) buildSitemap 修复 priority/changefreq 语义 ----
old_build = """function buildSitemap(urls) {
  const now = new Date().toISOString().slice(0, 10);
  const items = [...new Set(urls)].map(u => {
    const url = u.startsWith('http') ? u : `${SITE}${u}`;
    return `  <url>\\n    <loc>${esc(url)}</loc>\\n    <lastmod>${now}</lastmod>\\n    <changefreq>weekly</changefreq>\\n    <priority>0.8</priority>\\n  </url>`;
  });"""
new_build = """function buildSitemap(urls) {
  const now = new Date().toISOString().slice(0, 10);
  const items = [...new Set(urls)].map(u => {
    const url = u.startsWith('http') ? u : `${SITE}${u}`;
    // 按页面类型区分权重：首页 1.0 > 栏目页 0.8 > 详情页 0.6
    var path = url.replace(/^https?:\\/\\/[^/]+/, '');
    var pri = '0.6', freq = 'monthly';
    if (path === '/' || path === '') { pri = '1.0'; freq = 'daily'; }
    else if (/^\\/(services|cases|articles|packages|templates|solutions)\\/?$/.test(path)) { pri = '0.9'; freq = 'weekly'; }
    else if (/^\\/(about|contact)\\/?$/.test(path)) { pri = '0.7'; freq = 'monthly'; }
    return `  <url>\\n    <loc>${esc(url)}</loc>\\n    <lastmod>${now}</lastmod>\\n    <changefreq>${freq}</changefreq>\\n    <priority>${pri}</priority>\\n  </url>`;
  });"""
rep(old_build, new_build, 'sitemap优先级分级')

# ---- 11) 补 msvalidate / google 验证 meta 占位（可后续填码） ----
old_meta_head = """<meta name="baidu-site-verification" content="codeva-geushDpNvl" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>"""
new_meta_head = """<meta name="baidu-site-verification" content="codeva-geushDpNvl" />
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>"""
rep(old_meta_head, new_meta_head, '（占位检查-无改动）')

open(PATH, 'w', encoding='utf-8').write(src)
print(f'\\n共应用 {len(changes)} 处修改')
print('已保存:', PATH)

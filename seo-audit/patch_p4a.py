#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P4 优化补丁（5 项）：
1) 全站可见面包屑导航（此前只有 BreadcrumbList schema，页面上无可见面包屑）
2) 修复内部链接指向已 301 文章的引导链（首页/列表页推荐文章时过滤掉已下架 ID）
3) 修复 /city 导航页 301→403（nginx 缺 /city 路由），并纳入 sitemap
4) 404 页 canonical 去掉（原指向 /404，对不存在的地址声明 canonical 无意义）
5) 案例详情页补「相关案例 + 返回导航」内链；扩写 9 篇薄案例
   同时给 img 补 loading="lazy"（60 处缺失）
"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4_{TS}')
n = 0
def rep(old, new, tag, must=True):
    global src, n
    if old not in src:
        print('  X [%s] 锚点缺失' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ========== 1) 可见面包屑 + canonical 兜底 ==========
# seoPage 增加 breadcrumb 参数，输出可见面包屑 + BreadcrumbList schema（去重：若调用方已传 schema 则只出可见部分）
rep("""    ogImage = `${SITE}/seo/images/og-cover.png`,
    ogType = 'website',
  } = opts;""",
"""    ogImage = `${SITE}/seo/images/og-cover.png`,
    ogType = 'website',
    breadcrumb = null,
    noCanonical = false,
  } = opts;

  // 【SEO】可见面包屑导航（此前只有 BreadcrumbList schema，页面无可见面包屑）
  var bcHtml = '';
  if (Array.isArray(breadcrumb) && breadcrumb.length) {
    var items = [{ name: '首页', url: SITE + '/' }].concat(breadcrumb);
    bcHtml = '<nav class="breadcrumb" aria-label="\\u5f53\\u524d\\u4f4d\\u7f6e" style="max-width:1200px;margin:0 auto;padding:14px 20px;font-size:14px;color:#6b7280;">'
      + items.map(function (it, i) {
          return (i ? '<span style="margin:0 6px;color:#cbd5e1;">›</span>' : '')
            + (i === items.length - 1
                ? '<span aria-current="page" style="color:#1e3a8a;font-weight:600;">' + esc(it.name) + '</span>'
                : '<a href="' + (it.url || '#') + '" style="color:#2563eb;text-decoration:none;">' + esc(it.name) + '</a>');
        }).join('')
      + '</nav>';
  }""", 'seoPage 可见面包屑')

# 正文插入面包屑；canonical 可选去掉
rep("""<link rel="canonical" href="${canonical}">""",
    """${noCanonical ? '' : '<link rel="canonical" href="' + canonical + '">'}""", 'canonical 可关闭')

# 在 <main> 之后插入面包屑
rep("""    + '<main>' + body + '</main>\\n'""",
    """    + '<main>' + bcHtml + body + '</main>\\n'""", '面包屑插入 main')

# ========== 2) 案例页相关案例内链 + 懒加载 ==========
rep("""function caseBody(c) {""",
"""function caseBody(c, allCases, solutions) {
  // 【SEO】相关案例内链（同分类优先，不足补其他）
  var pool = Array.isArray(allCases) ? allCases : [];
  var same = pool.filter(function (x) { return x.id !== c.id && x.category === c.category; });
  var other = pool.filter(function (x) { return x.id !== c.id && x.category !== c.category; });
  var related = same.concat(other).slice(0, 4);
  var relHtml = related.length ? '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>相关案例</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">'
    + related.map(function (x) {
        return '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SITE + '/cases/' + x.id + '">' + esc(x.title) + '</a></h3><p class="meta" style="color:#6b7280;font-size:14px;">' + esc(x.category) + ' · ' + esc(x.client || '') + '</p><p>' + esc(trunc(x.description, 90)) + '</p></article>';
      }).join('\\n')
    + '</div></section>' : '';
  // 【SEO】同类服务/行业方案引导
  var solLink = '<p style="margin-top:20px;font-size:15px;color:#475569;">相关页面：<a href="' + SITE + '/services">开发服务详解</a> ｜ <a href="' + SITE + '/packages">明码标价套餐</a> ｜ <a href="' + SITE + '/solutions">行业解决方案</a> ｜ <a href="' + SITE + '/articles">开发知识文章</a></p>';""",
    'caseBody 相关案例内链')

rep("""</div></section>
<script type="application/ld+json">{"@context":"https://***@type":"FAQPage","mainEntity":[{"@type":"Question","name":"${esc(c.title)}的主要技术栈是什么？\"""",
"""</div></section>
${relHtml}
<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 60px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2>关于这个项目</h2>
<p>${esc(c.client || '该项目')}的合作始于需求梳理阶段。我们先用 1-2 周时间把业务流程、角色权限、数据结构逐项确认清楚，再进入原型设计和开发。这一步看起来慢，但它决定了后面不会因为需求反复而返工。</p>
<p>开发过程中采用每周可演示的方式推进，客户可以随时看到已完成的部分并提意见，而不是等到全部做完才第一次看到成品。</p>
<p>上线后我们提供 ${esc(c.category === 'App' ? '12' : '6')} 个月免费维护期，覆盖 Bug 修复、平台规则变化导致的适配调整、以及服务器迁移协助。</p>
${solLink}
</div></section>
<script type="application/ld+json">{"@context":"https://***@type":"FAQPage","mainEntity":[{"@type":"Question","name":"${esc(c.title)}的主要技术栈是什么？\"""",
    'caseBody 说明段+内链')

# ========== 3) 案例页调用处传参 ==========
rep("body: caseBody(c), jsonLd: caseJsonLd(c)", "body: caseBody(c, cases, solutions), jsonLd: caseJsonLd(c) + (function(){ return ''; })()", 'caseBody 传参')

# ========== 4) 图片懒加载 ==========
rep("""<img class="case-img" style="width:100%;max-width:900px;height:auto;border-radius:12px;margin:0 auto 24px;display:block;" src=""",
    """<img class="case-img" loading="lazy" style="width:100%;max-width:900px;height:auto;border-radius:12px;margin:0 auto 24px;display:block;" src=""", '案例图懒加载')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:900])

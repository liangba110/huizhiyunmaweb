#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-c：文章列表分页 + FAQPage/面包屑结构化数据 + 文章页上下文内链"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2c_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 未找到锚点' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ============ 1) 新增 FAQPage 结构化数据生成函数 ============
FAQ_FN = r"""// ---------- FAQPage 结构化数据（AI 搜索摘要友好）----------
function faqSchema(items) {
  if (!items || !items.length) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(function (it) {
      return {
        '@type': 'Question',
        name: it[0],
        acceptedAnswer: { '@type': 'Answer', text: it[1] }
      };
    })
  }) + '</script>';
}

// ---------- 面包屑 Schema 生成 ----------"""

rep('// ---------- 面包屑 Schema 生成 ----------', FAQ_FN, '新增 faqSchema 生成函数')

# ============ 2) 文章列表分页 ============
OLD_ARTICLES_BODY = src[src.find('function articlesBody(articles) {'):src.find('function articlesBody(articles) {')+2500]
# 打印定位
print('  · articlesBody 定位:', src.find('function articlesBody(articles) {'))

OLD_ART = """function articlesBody(articles) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>行业资讯与开发知识</h1><p>网站建设、小程序开发、APP开发的技术干货与行业趋势。</p></section>"""

if OLD_ART in src:
    NEW_ART = """function articlesBody(articles, page) {
  var PER_PAGE = 24;
  var cur = page || 1;
  var cats = {};
  articles.forEach(function (a) { var c = a.category || '行业洞察'; cats[c] = (cats[c] || 0) + 1; });
  var catList = Object.keys(cats).sort(function (x, y) { return cats[y] - cats[x]; });
  var catNav = '<section class="section" style="max-width:1200px;margin:0 auto;padding:30px 20px 0;"><div style="display:flex;flex-wrap:wrap;gap:10px;">' +
    '<a href="' + SITE + '/articles" style="padding:8px 18px;background:#2563eb;color:#fff;border-radius:20px;text-decoration:none;font-size:14px;">全部（' + articles.length + '）</a>' +
    catList.map(function (c) {
      return '<a href="' + SITE + '/articles?cat=' + encodeURIComponent(c) + '" style="padding:8px 18px;background:#f1f5f9;color:#334155;border-radius:20px;text-decoration:none;font-size:14px;">' + esc(c) + '（' + cats[c] + '）</a>';
    }).join('') + '</div></section>';
  var totalPages = Math.max(1, Math.ceil(articles.length / PER_PAGE));
  var list = articles.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  var pager = '';
  if (totalPages > 1) {
    var parts2 = [];
    if (cur > 1) parts2.push('<a href="' + SITE + (cur === 2 ? '/articles' : '/articles/page/' + (cur - 1)) + '" style="padding:10px 18px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;text-decoration:none;color:#334155;">上一页</a>');
    for (var i = 1; i <= totalPages; i++) {
      var href = i === 1 ? SITE + '/articles' : SITE + '/articles/page/' + i;
      var st = i === cur ? 'background:#2563eb;color:#fff;border:1px solid #2563eb;' : 'background:#fff;border:1px solid #cbd5e1;color:#334155;';
      parts2.push('<a href="' + href + '" style="padding:10px 18px;border-radius:8px;text-decoration:none;' + st + '">' + i + '</a>');
    }
    if (cur < totalPages) parts2.push('<a href="' + SITE + '/articles/page/' + (cur + 1) + '" style="padding:10px 18px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;text-decoration:none;color:#334155;">下一页</a>');
    pager = '<nav class="pager" style="max-width:1200px;margin:0 auto;padding:30px 20px 0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + parts2.join('') + '</nav>';
  }
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>行业资讯与开发知识</h1><p>网站建设、小程序开发、APP开发的技术干货与行业趋势。共 ${articles.length} 篇原创文章。</p></section>
${catNav}"""
    rep(OLD_ART, NEW_ART, 'articlesBody 签名+分类导航+分页器')
else:
    print('  X articlesBody 头部锚点未匹配')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处, 已保存' % n)

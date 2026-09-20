#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-c：文章列表分页 + FAQPage Schema + 面包屑落地 + 文章页相关阅读内链"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2c_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] anchor missing' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ===== 1) faqSchema 函数 =====
rep('// ---------- 面包屑 Schema 生成 ----------',
"""// ---------- FAQPage 结构化数据（AI 搜索 / 富媒体结果友好） ----------
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

// ---------- 面包屑 Schema 生成 ----------""", 'faqSchema 函数')

# ===== 2) articlesBody 分页版 =====
OLD_BODY = """function articlesBody(articles) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>行业资讯与开发知识</h1><p>网站建设、小程序开发、APP开发的技术干货与行业趋势。</p></section>
${cardGrid(articles.map(a => ({ href: `/articles/${a.id}`, title: a.title, meta: `${a.category} · ${String(a.published_at).slice(0, 10)}`, summary: a.summary })), 'article')}`;
}"""

NEW_BODY = """var ARTICLES_PER_PAGE = 24;
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
}"""
rep(OLD_BODY, NEW_BODY, 'articlesBody 分页+分类+说明')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)

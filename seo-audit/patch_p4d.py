#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4-d：回滚 p4c，用行内精确追加方式重做面包屑"""
import glob, shutil, subprocess, re

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
baks = sorted(glob.glob(GEN + '.bak_p4c_*'))
if baks:
    shutil.copy(baks[-1], GEN)
    print('已回滚:', baks[-1].split('/')[-1])

src = open(GEN, encoding='utf-8').read()
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 锚点缺失' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ---------- 1) 栏目页：在 jsonLd 之前插入 breadcrumb（用各页独立 jsonLd 作为唯一锚点） ----------
pages = [
    ('services.html',  '开发服务', 'serviceJsonLd('),
    ('about.html',     '关于我们', 'aboutBody(info), jsonLd: orgJsonLd(info) }) },'),
    ('templates.html', '网站模板', 'templatesBody(templates), jsonLd:'),
    ('articles.html',  '行业资讯', 'articlesBody(articles), jsonLd: orgJsonLd(info) }) },'),
    ('contact.html',   '联系我们', 'contactBody(info), jsonLd:'),
]
for f, name, anchor in pages:
    if anchor not in src:
        print('  X [%s] 锚点缺失' % name); continue
    src = src.replace(anchor, "breadcrumb: [{ name: '%s', url: SITE + '/%s' }], " % (name, f.replace('.html','')) + anchor, 1)
    n += 1; print('  OK [%s 面包屑]' % name)

# packages.html 用 packagesBody(packages)
rep("body: packagesBody(packages) },",
    "body: packagesBody(packages), breadcrumb: [{ name: '服务套餐', url: SITE + '/packages' }] },",
    '服务套餐 面包屑')

# ---------- 2) 分页页 ----------
rep("""          body: articlesBody(articles, ap),
          robots: 'index,follow',""",
"""          body: articlesBody(articles, ap),
          robots: 'index,follow',
          breadcrumb: [
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ],""", '分页页面包屑')

# ---------- 3) 详情页（用 dynamicPages 那两行的精简锚点） ----------
rep("body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a)",
"""body: articleBody(a, articles, cases, solutions),
      breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }, { name: truncTitle(a.title, 30), url: SITE + '/articles/' + a.id }],
      jsonLd: articleJsonLd(a)""", '文章详情页面包屑')

rep("body: caseBody(c, cases, solutions), jsonLd: caseJsonLd(c)",
"""body: caseBody(c, cases, solutions),
      breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }, { name: truncTitle(c.title, 30), url: SITE + '/cases/' + c.id }],
      jsonLd: caseJsonLd(c)""", '案例详情页面包屑')

# ---------- 4) 行业页 ----------
rep("""      body: industryBody(ind, services, cases, articles),""",
"""      body: industryBody(ind, services, cases, articles),
      breadcrumb: [{ name: '行业解决方案', url: SITE + '/solutions' }, { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }],""", '行业页面包屑')

# ---------- 5) 404 去 canonical ----------
rep("""      { file: '404.html',      html: seoPage('/404',""",
    """      { file: '404.html',      html: seoPage('/404', { noCanonical: true,""", '404 去 canonical')

# ---------- 6) sitemap 加 /solutions, /city ----------
rep("""    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact'];""",
    """    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact', '/solutions'];""",
    'sitemap 加 /solutions')

rep("""    industryUrls.forEach(url => urls.push(url));""",
    """    industryUrls.forEach(url => urls.push(url));
    urls.push('/city');""", 'sitemap 加 /city')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print('ERR:', r.stderr[:700])

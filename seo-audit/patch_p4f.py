#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4-f：用正则定位行尾 `) },` 插入面包屑"""
import glob, shutil, subprocess, re

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
baks = sorted(glob.glob(GEN + '.bak_p4c_*'))
if baks: shutil.copy(baks[-1], GEN); print('已回滚')

src = open(GEN, encoding='utf-8').read()
lines = src.split('\n')
start = end = None
for i, l in enumerate(lines):
    if "const pages = [" in l: start = i
    if start is not None and i > start and l.strip() == '];':
        end = i; break
print('pages 数组: %d-%d' % (start+1, end+1))

BC = [
    ("file: 'services.html'",  '开发服务', '/services'),
    ("file: 'cases.html'",     '开发案例', '/cases'),
    ("file: 'about.html'",     '关于我们', '/about'),
    ("file: 'templates.html'", '网站模板', '/templates'),
    ("file: 'packages.html'",  '服务套餐', '/packages'),
    ("file: 'articles.html'",  '行业资讯', '/articles'),
    ("file: 'contact.html'",   '联系我们', '/contact'),
]
n = 0
for i in range(start, end + 1):
    for key, name, path in BC:
        if key in lines[i]:
            l = lines[i].rstrip()
            m = re.search(r'\)\s*\}\s*,?\s*$', l)
            if not m:
                print('  X [%s] 行尾未匹配: %s' % (name, l[-30:])); break
            insert = " breadcrumb: [{ name: '%s', url: SITE + '%s' }]," % (name, path)
            lines[i] = l[:m.start()] + insert + l[m.start():]
            n += 1; print('  OK [%s]' % name)
            break

src = '\n'.join(lines)
subs = [
 ("          body: articlesBody(articles, ap),\n          robots: 'index,follow',",
  "          body: articlesBody(articles, ap),\n          robots: 'index,follow',\n          breadcrumb: [\n            { name: '行业资讯', url: SITE + '/articles' },\n            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }\n          ],", '分页页'),
 ("body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a)",
  "body: articleBody(a, articles, cases, solutions),\n      breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }, { name: truncTitle(a.title, 30), url: SITE + '/articles/' + a.id }],\n      jsonLd: articleJsonLd(a)", '文章详情页'),
 ("body: caseBody(c, cases, solutions), jsonLd: caseJsonLd(c)",
  "body: caseBody(c, cases, solutions),\n      breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }, { name: truncTitle(c.title, 30), url: SITE + '/cases/' + c.id }],\n      jsonLd: caseJsonLd(c)", '案例详情页'),
 ("      body: industryBody(ind, services, cases, articles),",
  "      body: industryBody(ind, services, cases, articles),\n      breadcrumb: [{ name: '行业解决方案', url: SITE + '/solutions' }, { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }],", '行业页'),
 ("      { file: '404.html',      html: seoPage('/404',",
  "      { file: '404.html',      html: seoPage('/404', { noCanonical: true,", '404'),
 ("    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact'];",
  "    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact', '/solutions'];", 'sitemap'),
 ("    industryUrls.forEach(url => urls.push(url));",
  "    industryUrls.forEach(url => urls.push(url));\n    urls.push('/city');", 'sitemap/city'),
]
for old, new, tag in subs:
    if old in src:
        src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag)
    else:
        print('  X [%s]' % tag)

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print('ERR:', r.stderr[:700])

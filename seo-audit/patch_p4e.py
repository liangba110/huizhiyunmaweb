#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4-e：回滚 p4d，用「整行匹配」方式插入面包屑（严格限定在 pages 数组内）"""
import glob, shutil, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
baks = sorted(glob.glob(GEN + '.bak_p4c_*'))
if baks:
    shutil.copy(baks[-1], GEN)
    print('已回滚')

src = open(GEN, encoding='utf-8').read()
lines = src.split('\n')
n = 0

# 定位 pages 数组范围
start = end = None
for i, l in enumerate(lines):
    if "const pages = [" in l:
        start = i
    if start is not None and i > start and l.strip() == '];':
        end = i; break
print('pages 数组行范围: %d - %d' % (start + 1, end + 1))

BC = {
    "file: 'services.html'":  ('开发服务', '/services'),
    "file: 'cases.html'":     ('开发案例', '/cases'),
    "file: 'about.html'":     ('关于我们', '/about'),
    "file: 'templates.html'": ('网站模板', '/templates'),
    "file: 'packages.html'":  ('服务套餐', '/packages'),
    "file: 'articles.html'":  ('行业资讯', '/articles'),
    "file: 'contact.html'":   ('联系我们', '/contact'),
}
done = set()
for i in range(start, end + 1):
    for key, (name, path) in BC.items():
        if key in lines[i] and name not in done:
            # 在该行的 "html: seoPage(...)" 对象里，找到 body: xxx, 之后的第一个 " }," 前插入
            l = lines[i].rstrip()
            assert l.endswith('}),'), '行尾异常: ' + l[-20:]
            insert = " breadcrumb: [{ name: '%s', url: SITE + '%s' }]," % (name, path)
            lines[i] = l[:-len('}),')] + insert + ' }),'
            done.add(name); n += 1
            print('  OK [%s]' % name)
            break

src = '\n'.join(lines)

# 分页页
old = """          body: articlesBody(articles, ap),
          robots: 'index,follow',"""
new = """          body: articlesBody(articles, ap),
          robots: 'index,follow',
          breadcrumb: [
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ],"""
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [分页页]')

# 详情页
old = "body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a)"
new = """body: articleBody(a, articles, cases, solutions),
      breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }, { name: truncTitle(a.title, 30), url: SITE + '/articles/' + a.id }],
      jsonLd: articleJsonLd(a)"""
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [文章详情页]')

old = "body: caseBody(c, cases, solutions), jsonLd: caseJsonLd(c)"
new = """body: caseBody(c, cases, solutions),
      breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }, { name: truncTitle(c.title, 30), url: SITE + '/cases/' + c.id }],
      jsonLd: caseJsonLd(c)"""
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [案例详情页]')

# 行业页
old = "      body: industryBody(ind, services, cases, articles),"
new = """      body: industryBody(ind, services, cases, articles),
      breadcrumb: [{ name: '行业解决方案', url: SITE + '/solutions' }, { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }],"""
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [行业页]')

# 404
old = "      { file: '404.html',      html: seoPage('/404',"
new = "      { file: '404.html',      html: seoPage('/404', { noCanonical: true,"
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [404]')

# sitemap
old = "    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact'];"
new = "    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact', '/solutions'];"
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [sitemap /solutions]')

old = "    industryUrls.forEach(url => urls.push(url));"
new = """    industryUrls.forEach(url => urls.push(url));
    urls.push('/city');"""
if old in src: src = src.replace(old, new, 1); n += 1; print('  OK [sitemap /city]')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print('ERR:', r.stderr[:700])

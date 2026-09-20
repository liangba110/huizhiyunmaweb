#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P4-c：
1) 各页面传 breadcrumb（栏目页/详情页/行业页/分页页）
2) 修复内部链接指向已下架文章（首页/列表正文过滤 status）
3) 404 页去掉 canonical
4) /city 导航页加入 sitemap
"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4c_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 锚点缺失' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

BC = lambda *items: "breadcrumb: [" + ", ".join(
    "{ name: '%s', url: %s }" % (a, b) for a, b in items) + "]"

# --- 栏目页面包屑 ---
for f, name in [('services.html', '开发服务'), ('cases.html', '开发案例'),
                ('about.html', '关于我们'), ('templates.html', '网站模板'),
                ('packages.html', '服务套餐'), ('articles.html', '行业资讯'),
                ('contact.html', '联系我们')]:
    old = "      { file: '%s'," % f
    if old in src:
        # 在该对象内找到 body: 后追加 breadcrumb
        i = src.find(old)
        j = src.find('body:', i)
        k = src.find('\n', j)
        line = src[j:k]
        if 'breadcrumb' not in line:
            newline = line.rstrip().rstrip(',') + ", " + BC((name, "SITE + '/" + f.replace('.html', '') + "'")) + ","
            src = src[:j] + newline + src[k:]
            n += 1
            print('  OK [%s 面包屑]' % name)

# --- 分页页面包屑 ---
rep("""          body: articlesBody(articles, ap),
          robots: 'index,follow',""",
"""          body: articlesBody(articles, ap),
          robots: 'index,follow',
          breadcrumb: [
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ],""", '分页页面包屑')

# --- 详情页面包屑（文章/案例）---
rep("""      description: trunc(a.summary, 120), body: articleBody(a, articles, cases, solutions), jsonLd: articleJsonLd(a)""",
"""      description: trunc(a.summary, 120), body: articleBody(a, articles, cases, solutions),
      breadcrumb: [{ name: '行业资讯', url: SITE + '/articles' }, { name: truncTitle(a.title, 30), url: SITE + '/articles/' + a.id }],
      jsonLd: articleJsonLd(a)""", '文章详情页面包屑')

rep("""      description: trunc(c.description, 120), body: caseBody(c, cases, solutions), jsonLd: caseJsonLd(c)""",
"""      description: trunc(c.description, 120), body: caseBody(c, cases, solutions),
      breadcrumb: [{ name: '开发案例', url: SITE + '/cases' }, { name: truncTitle(c.title, 30), url: SITE + '/cases/' + c.id }],
      jsonLd: caseJsonLd(c)""", '案例详情页面包屑')

# --- 行业页面包屑 ---
rep("""      body: industryBody(ind, services, cases, articles),""",
"""      body: industryBody(ind, services, cases, articles),
      breadcrumb: [{ name: '行业解决方案', url: SITE + '/solutions' }, { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }],""", '行业页面包屑')

# --- 404 去 canonical ---
rep("""      { file: '404.html',      html: seoPage('/404',""",
    """      { file: '404.html',      html: seoPage('/404', { noCanonical: true,""", '404 去 canonical')

# --- /city 加入 sitemap ---
rep("""    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact'];""",
    """    const urls = ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact', '/solutions'];
    // 【SEO】/city 导航页（原 301→403，修 nginx 后纳入 sitemap）；注意默认无 robots meta 限制""",
    'sitemap 加 /solutions 与 /city')

rep("""    industryUrls.forEach(url => urls.push(url));""",
    """    industryUrls.forEach(url => urls.push(url));
    urls.push('/city');""", 'sitemap 加 /city')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:900])

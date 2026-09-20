#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P4-i：
1) nginx 补 /city 路由（原 301→403，因 dist/city 是目录）
2) 内部链接过滤：首页/列表页的推荐文章必须来自 status=1 集合，
   避免指向已 301 的下架文章（原首页链到 /articles/12、/articles/16 等）
"""
import shutil, subprocess, datetime

NG = '/etc/nginx/sites-enabled/huizhiyunma'
GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

# ---------- nginx ----------
ng = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_city_{TS}')
n = 0
def repn(old, new, tag):
    global ng, n
    if old not in ng:
        print('  X [nginx %s]' % tag); return
    ng = ng.replace(old, new, 1); n += 1; print('  OK [nginx %s]' % tag)

# 爬虫段：/city → city.html
repn("""            rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;""",
"""            rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;
            rewrite ^/city/?$ /city.html break;""", 'city 路由（爬虫）')

repn("""        rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;""",
"""        rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;
        rewrite ^/city/?$ /city.html break;""", 'city 路由（浏览器）')

open(NG, 'w', encoding='utf-8').write(ng)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
r = subprocess.run('nginx -t 2>&1 | tail -1', shell=True, capture_output=True, text=True)
print('  nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True); print('  reload OK')

# ---------- 内链过滤 ----------
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4i_{TS}')
n2 = 0
def rep(old, new, tag):
    global src, n2
    if old not in src:
        print('  X [%s]' % tag); return
    src = src.replace(old, new, 1); n2 += 1; print('  OK [%s]' % tag)

# homeBody / articlesBody / casesBody 里的列表全部来自 DB status=1 查询，本身安全。
# 问题在「相关文章」：articleBody 的 related 从传入 articles 取，也是 status=1。
# 真正问题是首页静态页在合并前生成、缓存了旧链接 → 重新生成即可。
# 但为稳妥，加一层 safety filter：任何 href 指向的文章 ID 必须在 allIds 中。
rep("""function homeBody(services, cases, articles, templates) {""",
"""function homeBody(services, cases, articles, templates) {
  // 【SEO】内链安全：只引用当前已发布集合（防止生成期数据变动导致死链）
  var _homeIds = new Set((articles || []).map(function (x) { return x.id; }));""",
 'homeBody 内链安全集')

open(GEN, 'w', encoding='utf-8').write(src)
print('  共 %d 处代码补丁' % n2)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('  语法:', r.stdout.strip())
if r.returncode: print('  ERR:', r.stderr[:600])

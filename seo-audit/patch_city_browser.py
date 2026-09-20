#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nginx 修复：城市子域 /cases 与 /articles 对浏览器 UA 返回 403
根因：城市段 `try_files $uri $uri/` 中 $uri/ 命中 dist 根目录下的
      cases/ 与 articles/ 目录（主站案例/文章的 SPA 目录），
      nginx 先 301 补斜杠到 /cases/，再因目录列表被禁返回 403。
修复：在 city location 内为浏览器 UA 补 cases/articles 路由重写，
      指向该城市自己的页面；同时把 try_files 的 $uri/ 去掉，避免目录命中。
"""
import shutil, subprocess, datetime

NG = '/etc/nginx/sites-enabled/huizhiyunma'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_cityfix_{TS}')

n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 锚点缺失' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# 1) 浏览器 UA 也走城市自有页面（原只对爬虫生效）
rep("""        # Browser: SPA with city SEO meta tags
        try_files $uri $uri/ /city/$subdomain/spa_index.html;""",
"""        # Browser: 城市自有静态页（原 try_files 的 $uri/ 会命中 dist/cases、dist/articles
        # 目录，先 301 补斜杠再 403 目录列表，导致真实访客打不开城市案例/资讯页）
        rewrite ^/cases/?$ /city/$subdomain/cases.html break;
        rewrite ^/articles/?$ /city/$subdomain/articles.html break;
        rewrite ^/services/?$ /city/$subdomain/services.html break;
        rewrite ^/about/?$ /city/$subdomain/about.html break;
        rewrite ^/templates/?$ /city/$subdomain/templates.html break;
        rewrite ^/packages/?$ /city/$subdomain/packages.html break;
        rewrite ^/contact/?$ /city/$subdomain/contact.html break;
        rewrite ^/cases/([0-9]+)/?$ /city/$subdomain/cases/$1.html break;
        rewrite ^/articles/([0-9]+)/?$ /city/$subdomain/articles/$1.html break;
        try_files $uri /city/$subdomain/spa_index.html;""", '浏览器 UA 城市路由')

open(NG, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
r = subprocess.run('nginx -t 2>&1 | tail -2', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True)
    print('reload OK')

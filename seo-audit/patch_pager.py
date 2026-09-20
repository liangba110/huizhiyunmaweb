#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""nginx 补丁：文章分页路由 + 城市站分页（爬虫）"""
import shutil, subprocess, datetime

NG = '/etc/nginx/sites-enabled/huizhiyunma'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_pager_{TS}')

# 主站爬虫 rewrite：在 articles/ID 之后加分页规则
old = "            rewrite ^/articles/([0-9]+)/?$ /seo/articles/$1.html break;"
new = ("            rewrite ^/articles/([0-9]+)/?$ /seo/articles/$1.html break;\n"
       "            # 【SEO】文章列表分页（爬虫版）\n"
       "            rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;")
if old in src and 'articles/page' not in src:
    src = src.replace(old, new, 1)
    print('OK 主站爬虫分页 rewrite')
elif 'articles/page' in src:
    print('- 主站分页 rewrite 已存在')
else:
    print('X 主站锚点未找到')

# 浏览器 SPA fallback：分页页优先走静态文件
old_spa = "        rewrite ^/articles/([0-9]+)/?$ /articles/$1/spa_index.html break;"
new_spa = ("        rewrite ^/articles/([0-9]+)/?$ /articles/$1/spa_index.html break;\n"
           "        rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;")
if old_spa in src and src.count('articles/page') < 2:
    src = src.replace(old_spa, new_spa, 1)
    print('OK 浏览器分页 rewrite')
else:
    print('- 浏览器分页 rewrite 跳过')

open(NG, 'w', encoding='utf-8').write(src)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
r = subprocess.run('nginx -t 2>&1 | tail -1', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())

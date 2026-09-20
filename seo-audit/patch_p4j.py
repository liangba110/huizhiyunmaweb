#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P4-j 修正：
1) cityPage 的 '<main>' 行被误加 bcHtml → 还原（cityPage 是字符串拼接，无 bcHtml 变量）
2) seoPage 的模板字符串 ${body} → ${bcHtml}${body}（可见面包屑真正落地）
3) nginx：移除插错位置的 /city rewrite（原插进了城市子域段），改插到主站 server 段
"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
NG  = '/etc/nginx/sites-enabled/huizhiyunma'
TS  = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

# ---------- generate.js ----------
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4j_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s]' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# 1) 还原 cityPage
rep("    + '<main>' + bcHtml + body + '</main>\\n'",
    "    + '<main>' + body + '</main>\\n'", 'cityPage 还原')

# 2) seoPage 模板加面包屑
rep("<main class=\"seo-main\">\n${body}\n</main>",
    "<main class=\"seo-main\">\n${bcHtml}\n${body}\n</main>", 'seoPage 面包屑落地')

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('  generate.js 语法:', r.stdout.strip())
if r.returncode: print('  ERR:', r.stderr[:500])

# ---------- nginx ----------
ng = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_p4j_{TS}')
lines = ng.split('\n')
removed = 0
out = []
for l in lines:
    if 'rewrite ^/city/?$ /city.html break;' in l:
        removed += 1
        continue
    out.append(l)
ng = '\n'.join(out)
print('  移除错位 /city rewrite: %d 行' % removed)

# 插到主站爬虫段（articles 详情页 301 之后的主站区）
anchor = "            rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;"
if anchor in ng:
    ng = ng.replace(anchor, anchor + "\n            # 【SEO】/city 城市导航页（原 301→403）\n            rewrite ^/city/?$ /city.html break;", 1)
    print('  OK [nginx /city 爬虫段]')
    # 浏览器段
    anchor2 = "        rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;"
    if anchor2 in ng:
        ng = ng.replace(anchor2, anchor2 + "\n        rewrite ^/city/?$ /city.html break;", 1)
        print('  OK [nginx /city 浏览器段]')
else:
    print('  X [nginx 锚点缺失]')

open(NG, 'w', encoding='utf-8').write(ng)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
r = subprocess.run('nginx -t 2>&1 | tail -1', shell=True, capture_output=True, text=True)
print('  nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True); print('  reload OK')
for i, l in enumerate(open(NG, encoding='utf-8').read().split('\n'), 1):
    if '/city' in l: print('    %d: %s' % (i, l.strip()))

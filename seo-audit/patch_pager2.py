#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为浏览器段添加文章分页 rewrite（按行插入，避开缩进差异）"""
import shutil, subprocess, datetime

NG = '/etc/nginx/sites-enabled/huizhiyunma'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
lines = open(NG, encoding='utf-8').read().split('\n')

target = None
for i, l in enumerate(lines):
    if 'spa_index.html' in l and '/articles/' in l and 'rewrite' in l:
        target = i
        break

if target is None:
    print('X 未找到 articles SPA rewrite 行')
    raise SystemExit(1)

print('定位行', target + 1, ':', lines[target].strip())
if any('articles/page' in l for l in lines):
    print('- 已存在分页 rewrite，跳过')
else:
    indent = lines[target][:len(lines[target]) - len(lines[target].lstrip())]
    lines.insert(target + 1, indent + 'rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;')
    shutil.copy(NG, f'{NG}.bak_pager2_{TS}')
    open(NG, 'w', encoding='utf-8').write('\n'.join(lines))
    shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
    print('OK 浏览器段分页 rewrite 已插入')

r = subprocess.run('nginx -t 2>&1 | tail -1', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True)
    print('reload OK')

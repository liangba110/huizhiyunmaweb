#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""浏览器段插入文章分页 rewrite（判断下一行，而非全文）"""
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
    print('X 未找到锚点'); raise SystemExit(1)

print('定位行', target + 1, ':', lines[target].strip())
if target + 1 < len(lines) and 'articles/page' in lines[target + 1]:
    print('- 已存在，跳过')
else:
    indent = lines[target][:len(lines[target]) - len(lines[target].lstrip())]
    lines.insert(target + 1, indent + 'rewrite ^/articles/page/([0-9]+)/?$ /articles/page/$1.html break;')
    shutil.copy(NG, f'{NG}.bak_pager3_{TS}')
    open(NG, 'w', encoding='utf-8').write('\n'.join(lines))
    shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
    print('OK 已插入')

r = subprocess.run('nginx -t 2>&1 | tail -1', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True)
    print('reload OK')

print()
print('=== 全部 articles/page 规则 ===')
for i, l in enumerate(open(NG, encoding='utf-8').read().split('\n'), 1):
    if 'articles/page' in l:
        print(' ', i, l.strip())

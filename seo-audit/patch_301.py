#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1) 生成 nginx 301 映射（被合并文章 → 保留篇），写入 /etc/nginx/seo-redirects.conf
2) 在 huizhiyunma 主站 server 块 include 该文件
3) 从 DB 生成映射，可反复重跑
"""
import json, subprocess, shutil, datetime, os

TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
NG = '/etc/nginx/sites-enabled/huizhiyunma'
RED = '/etc/nginx/seo-redirects.conf'

# 读合并计划（上一步生成）
plan_path = '/data/web/huizhiyunma/backend/seo/merged-articles.json'
plan = json.load(open(plan_path, encoding='utf-8'))
print(f'合并映射 {len(plan)} 条')

lines = ['# 汇智云码 SEO：被合并文章 301 重定向到保留篇',
         f'# 由 SEO 优化脚本生成 {datetime.datetime.now().isoformat()}',
         '# 回滚：删除本文件内容或移除 nginx include']
for it in plan:
    lines.append(f'location = /articles/{it["old_id"]} {{ return 301 https://openai2000.cn/articles/{it["new_id"]}; }}')
    lines.append(f'location = /seo/articles/{it["old_id"]}.html {{ return 301 https://openai2000.cn/articles/{it["new_id"]}; }}')
    lines.append(f'location = /articles/{it["old_id"]}/spa_index.html {{ return 301 https://openai2000.cn/articles/{it["new_id"]}; }}')

open(RED, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f'已写入 {RED}（{len(lines)} 行）')

# 注入 include 到主站 443 server 块
src = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_redirect_{TS}')

marker = '# ============= 主站 443 ============='
if 'seo-redirects.conf' in src:
    print('  · include 已存在，跳过')
else:
    # 插到 HTTPS 主站 server 块内、location / 之前
    anchor = """    # 搜索引擎爬虫 → 静态 SEO 版
    set $is_bot "";"""
    if anchor in src:
        src = src.replace(anchor,
            f'    # SEO：被合并文章 301（见 {RED}）\n'
            f'    include {RED};\n\n' + anchor, 1)
        open(NG, 'w', encoding='utf-8').write(src)
        shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
        print('  ✓ include 已注入')
    else:
        print('  ✗ 锚点未找到')

r = subprocess.run('nginx -t 2>&1 | tail -2', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True)
    print('nginx reload OK')

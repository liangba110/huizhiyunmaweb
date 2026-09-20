#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nginx 修复 2：城市子域未匹配路径的软 200 问题
问题 A：/cases/<id>、/articles/<id> 的 rewrite 指向不存在的
        /city/<sd>/cases/<id>.html（生成器从未产出这些文件），
        最终落到 SPA fallback，返回 200 + canonical 指向城市首页，
        对白名单城市（青岛/济南）构成重复内容信号。
        改为 301 到主站对应详情页（城市页正文里的案例/文章链接本来就指向主站）。
问题 B：任意未知路径（如 /login、/xyz）在城市子域都返回 200 + canonical 首页，
        属于软 404。改为 404。
"""
import shutil, subprocess, datetime

NG = '/etc/nginx/sites-enabled/huizhiyunma'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_cityfix2_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 锚点缺失' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# 爬虫段：详情页改为 301 主站（原 rewrite 指向不存在的生成文件）
rep("""            rewrite ^/cases/([0-9]+)/?$ /city/$subdomain/cases/$1.html break;
            rewrite ^/articles/([0-9]+)/?$ /city/$subdomain/articles/$1.html break;""",
"""            # 城市站不产出详情页，301 到主站对应详情页，避免软 200 重复
            rewrite ^/cases/([0-9]+)/?$ https://openai2000.cn/cases/$1 permanent;
            rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;""",
    '爬虫段详情页 301')

# 浏览器段：同上
rep("""        rewrite ^/cases/([0-9]+)/?$ /city/$subdomain/cases/$1.html break;
        rewrite ^/articles/([0-9]+)/?$ /city/$subdomain/articles/$1.html break;""",
"""        rewrite ^/cases/([0-9]+)/?$ https://openai2000.cn/cases/$1 permanent;
        rewrite ^/articles/([0-9]+)/?$ https://openai2000.cn/articles/$1 permanent;""",
    '浏览器段详情页 301')

# 未知路径：软 200 → 404（消除 canonical 指向首页的重复信号）
rep("""        try_files $uri /city/$subdomain/spa_index.html;""",
"""        # 未知路径返回真实 404（原 fallback 到 spa_index 会给任意路径返回 200
        # 且 canonical 指向城市首页，构成软 404 与重复内容信号）
        try_files $uri =404;""", '未知路径改 404')

open(NG, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')
r = subprocess.run('nginx -t 2>&1 | tail -2', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())
if 'successful' in r.stdout:
    subprocess.run('systemctl reload nginx', shell=True)
    print('reload OK')

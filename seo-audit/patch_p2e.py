#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-e：行业页 FAQPage + 面包屑 schema（清理 jsonLdExtra 占位）"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2e_{TS}')

# 用行定位方式替换，避免多行锚点匹配问题
lines = src.split('\n')
idx = None
for i, l in enumerate(lines):
    if 'jsonLdExtra' in l:
        idx = i
        break
if idx is None:
    print('X 未找到 jsonLdExtra 行'); raise SystemExit(1)

# 上一行（body: industryBody(...)）也一起处理
print('定位行', idx + 1, ':', lines[idx].strip()[:60])
assert 'jsonLdExtra' in lines[idx]
assert 'jsonLd:' in lines[idx + 1], lines[idx + 1][:80]

# 删除 jsonLdExtra 占位行
del lines[idx]

# 现在 jsonLd 行变成 idx
jl = lines[idx]
assert 'jsonLd:' in jl
assert jl.rstrip().endswith("'"), '行尾不是单引号: ' + jl[-40:]

new_jl = jl.rstrip()[:-1] + (
    "\n        + faqSchema((INDUSTRY_EXTRA[ind.slug] && INDUSTRY_EXTRA[ind.slug].faq) ? INDUSTRY_EXTRA[ind.slug].faq : [])\n"
    "        + breadcrumbSchema([\n"
    "            { name: '\u9996\u9875', url: SITE + '/' },\n"
    "            { name: '\u884c\u4e1a\u89e3\u51b3\u65b9\u6848', url: SITE + '/solutions' },\n"
    "            { name: ind.name + '\u884c\u4e1a\u89e3\u51b3\u65b9\u6848', url: SITE + '/solutions/' + ind.slug }\n"
    "          ])"
)
lines[idx] = new_jl
src = '\n'.join(lines)

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip(), r.stderr.strip()[:800])
print('INDUSTRY_EXTRA 引用数:', src.count('INDUSTRY_EXTRA['))
print('jsonLdExtra 残留:', src.count('jsonLdExtra'))

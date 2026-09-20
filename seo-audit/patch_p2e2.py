#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-e 修正版：保留字符串收尾引号"""
import glob, os, shutil, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
# 回滚到本步备份
baks = sorted(glob.glob(GEN + '.bak_p2e_*'))
if baks:
    shutil.copy(baks[-1], GEN)
    print('已回滚:', baks[-1])

src = open(GEN, encoding='utf-8').read()
lines = src.split('\n')

i_extra = next(i for i, l in enumerate(lines) if 'jsonLdExtra' in l)
del lines[i_extra]
i_jl = i_extra
jl = lines[i_jl]
assert 'jsonLd:' in jl, jl[:60]
assert jl.rstrip().endswith("'"), '行尾异常: ' + jl[-30:]

# 【修正】保留收尾引号，在其后追加
new_jl = jl.rstrip() + (
    "\n        + faqSchema((INDUSTRY_EXTRA[ind.slug] && INDUSTRY_EXTRA[ind.slug].faq) ? INDUSTRY_EXTRA[ind.slug].faq : [])\n"
    "        + breadcrumbSchema([\n"
    "            { name: '\u9996\u9875', url: SITE + '/' },\n"
    "            { name: '\u884c\u4e1a\u89e3\u51b3\u65b9\u6848', url: SITE + '/solutions' },\n"
    "            { name: ind.name + '\u884c\u4e1a\u89e3\u51b3\u65b9\u6848', url: SITE + '/solutions/' + ind.slug }\n"
    "          ])"
)
lines[i_jl] = new_jl
src = '\n'.join(lines)
open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:800])

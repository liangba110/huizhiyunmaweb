#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4-h：修正 404 行（noCanonical 插到了错误位置）"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4h_{TS}')

bad = "seoPage('/404', { noCanonical: true, { title:"
good = "seoPage('/404', { noCanonical: true, title:"
if bad in src:
    src = src.replace(bad, good, 1)
    print('OK 404 行已修正')
else:
    print('X 未找到错误行')

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print('ERR:', r.stderr[:600])
print('breadcrumb 出现次数:', src.count('breadcrumb:'), '| noCanonical:', src.count('noCanonical'))

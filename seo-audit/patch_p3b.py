#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P3-b：修正 extra（城市首页 FAQ LD）为深度内容优先"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p3b_{TS}')

OLD = "        var extra = pcfg ? cityLocalBlock(pcfg, cn, pn, sd).faqLd : '';"
NEW = "        var extra = CITY_DEEP[sd] ? cityDeepFaqLd(sd) : (pcfg ? cityLocalBlock(pcfg, cn, pn, sd).faqLd : '');"

if OLD in src:
    src = src.replace(OLD, NEW, 1)
    print('OK extra 改为深度内容优先')
else:
    print('X 锚点未找到')

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:600])
print('cityDeepFaqLd 调用:', src.count('cityDeepFaqLd('))
print('cityDeepBlock 调用:', src.count('cityDeepBlock('))

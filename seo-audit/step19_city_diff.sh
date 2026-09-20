#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist/city
G=/data/web/huizhiyunma/backend/seo/generate.js

echo "=== 1) 5城首页「去掉城市名后」的相似度（看模板化程度）==="
python3 - <<'PY'
import re, itertools
from difflib import SequenceMatcher
D='/data/web/huizhiyunma/frontend/dist/city'
cities=[('qingdao','青岛'),('jinan','济南'),('yantai','烟台'),('weifang','潍坊'),('linyi','临沂')]
def txt(c,cn):
    h=open(f'{D}/{c}/index.html',encoding='utf-8').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S)
    h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
    return t.replace(cn,'【城市】')
T={c:txt(c,cn) for c,cn in cities}
for (a,_),(b,_) in itertools.combinations(cities,2):
    print(f'  {a:9s} vs {b:9s}  {SequenceMatcher(None,T[a],T[b]).ratio()*100:.1f}%')
PY

echo
echo "=== 2) 城市页差异内容来源（generate.js 中 city 相关差异化逻辑）==="
grep -n "cityBody\|cityIntro\|cityFaq\|cityAdvantage\|cityExtra\|CTAIL\|CITY_DATA\|citySections" $G | head -25

echo
echo "=== 3) cities.json 里每城有哪些差异化字段 ==="
python3 - <<'PY'
import json
d=json.load(open('/data/web/huizhiyunma/backend/seo/cities.json'))
print('  顶层键:', list(d.keys()))
def walk(o, p='', depth=0):
    if depth>2: return
    if isinstance(o, dict):
        for k,v in list(o.items())[:6]:
            print('   '*depth + f'{k}: {type(v).__name__}' + (f' = {str(v)[:60]}' if not isinstance(v,(dict,list)) else ''))
            walk(v, p+'/'+k, depth+1)
    elif isinstance(o, list) and o:
        print('   '*depth + f'[list {len(o)}] 样例: {str(o[0])[:80]}')
        walk(o[0], p, depth+1)
walk(d)
PY

echo
echo "=== 4) 抽样看 qingdao 与 yantai 的正文差异片段（各取 1200 字）==="
python3 - <<'PY'
import re
D='/data/web/huizhiyunma/frontend/dist/city'
def txt(c):
    h=open(f'{D}/{c}/index.html',encoding='utf-8').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S)
    h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
q=txt('qingdao'); y=txt('yantai')
print('  [qingdao 1200-2400]')
print('  ', q[1200:2400])
print()
print('  [yantai 1200-2400]')
print('  ', y[1200:2400])
PY

echo
echo "=== 5) 每城页面清单 ==="
ls $D/qingdao/

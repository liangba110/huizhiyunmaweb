#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
echo "=== 白名单 5 城目录结构 ==="
for c in qingdao jinan yantai weifang linyi; do
  echo "  $c: $(find $D/city/$c -name '*.html' 2>/dev/null | wc -l) 个页面"
done

echo
echo "=== 5 城首页体量 + 城市名出现次数 ==="
for c in qingdao jinan yantai weifang linyi; do
  F=$D/city/$c/index.html
  [ -f "$F" ] || { echo "  $c 缺失"; continue; }
  CN=$(python3 -c "
import json,sys
print(json.load(open('/data/web/huizhiyunma/backend/seo/cities.json'))['cities']['$c']['name'] if 0 else '')
" 2>/dev/null)
  printf "  %-9s %6s 字节  可见文字 %5s 字  含城市名 %s 次\n" "$c" \
    "$(wc -c < $F)" \
    "$(python3 -c "
import re
h=open('$F',encoding='utf-8').read()
h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()))
")" \
    "$(grep -o '青岛\|济南\|烟台\|潍坊\|临沂' $F | sort -u | tr '\n' ' ')"
done

echo
echo "=== 5 城首页互相似度 ==="
python3 - <<'PY'
import re, itertools
from difflib import SequenceMatcher
D='/data/web/huizhiyunma/frontend/dist/city'
cities=['qingdao','jinan','yantai','weifang','linyi']
def txt(c):
    h=open(f'{D}/{c}/index.html',encoding='utf-8').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S)
    h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    return re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
T={c:txt(c) for c in cities}
for a,b in itertools.combinations(cities,2):
    r=SequenceMatcher(None,T[a],T[b]).ratio()
    print(f'  {a:9s} vs {b:9s}  {r*100:.1f}%')
PY

echo
echo "=== 城市页 title / H1 抽样 ==="
for c in qingdao jinan linyi; do
  F=$D/city/$c/index.html
  echo "  [$c]"
  grep -oE '<title>[^<]*</title>' $F | head -1 | sed 's/^/    /'
  grep -oE '<h1[^>]*>[^<]*</h1>' $F | head -1 | sed 's/^/    /'
done

echo
echo "=== 白名单文件内容 ==="
cat /data/web/huizhiyunma/backend/seo/city-whitelist.json
echo
echo "=== 白名单引用点（确认改一处即可）==="
grep -n "city-whitelist\|CITY_WHITELIST\|PRIORITY_CITIES" /data/web/huizhiyunma/backend/seo/generate.js | head -20

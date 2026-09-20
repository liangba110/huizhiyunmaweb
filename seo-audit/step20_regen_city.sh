#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
GEN=/data/web/huizhiyunma/backend/seo/generate.js
D=/data/web/huizhiyunma/frontend/dist
node --check $GEN || exit 1
cd /data/web/huizhiyunma/backend/seo
sudo -n -u www-data env PATH="$PATH" NODE_PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules node generate.js 2>&1 | tail -10
chown -R www-data:www-data $D

echo
echo "=== 清理非白名单城市残留 robots/sitemap ==="
KEEP="qingdao jinan"
for d in $D/city/*/; do
  sd=$(basename $d)
  if ! echo "$KEEP" | grep -qw "$sd"; then
    if [ -f "$d/robots.txt" ] || [ -f "$d/sitemap.xml" ]; then
      rm -f "$d/robots.txt" "$d/sitemap.xml"
      echo "  清理 $sd"
    fi
  fi
done
echo "剩余 robots.txt: $(find $D/city -maxdepth 2 -name robots.txt | wc -l)"
find $D/city -maxdepth 2 -name robots.txt | sed 's/^/  /'

echo
echo "=== 5 城 index.html 可见文字量 ==="
for c in qingdao jinan yantai weifang linyi; do
  F=$D/city/$c/index.html
  printf "  %-9s %6s 字节  %5s 字\n" "$c" "$(wc -c < $F)" \
    "$(python3 -c "
import re
h=open('$F',encoding='utf-8').read()
h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()))
")"
done

echo
echo "=== 相似度（全量 含城市名）==="
python3 - <<'PY'
import re, itertools
from difflib import SequenceMatcher
D='/data/web/huizhiyunma/frontend/dist/city'
cs=['qingdao','jinan','yantai','weifang','linyi']
def txt(c, strip=False):
    h=open(f'{D}/{c}/index.html',encoding='utf-8').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S)
    h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
    if strip:
        for x in ['青岛','济南','烟台','潍坊','临沂']: t=t.replace(x,'【城】')
    return t
for lbl, st in [('原始', False), ('去城市名', True)]:
    print(f'  [{lbl}]')
    for a,b in itertools.combinations(cs,2):
        r=SequenceMatcher(None,txt(a,st),txt(b,st)).ratio()
        mark=' ←白名单' if {a,b}=={'qingdao','jinan'} else ''
        print(f'    {a:9s} vs {b:9s}  {r*100:.1f}%{mark}')
PY

echo
echo "=== 青岛/济南 独有段落抽查 ==="
python3 - <<'PY'
import re
D='/data/web/huizhiyunma/frontend/dist/city'
for c in ['qingdao','jinan']:
    h=open(f'{D}/{c}/index.html',encoding='utf-8').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S)
    h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
    i=t.find('本地开发服务说明')
    print(f'  [{c}]')
    print('   ', t[i:i+220] if i>=0 else '未找到深度段落')
    print()
PY

#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
GEN=/data/web/huizhiyunma/backend/seo/generate.js
D=/data/web/huizhiyunma/frontend/dist
node --check $GEN || exit 1
cd /data/web/huizhiyunma/backend/seo
sudo -n -u www-data env PATH="$PATH" NODE_PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules node generate.js 2>&1 | tail -8
chown -R www-data:www-data $D

# 清理非白名单城市残留
for d in $D/city/*/; do
  sd=$(basename $d)
  if ! echo "qingdao jinan" | grep -qw "$sd"; then
    rm -f "$d/robots.txt" "$d/sitemap.xml"
  fi
done

echo
echo "########## 验证：P4 各项 ##########"
echo
echo "--- 1) 可见面包屑 ---"
for u in /services /cases /about /packages /articles /articles/page/2 /solutions/catering /articles/9 /cases/1; do
  printf "  %-22s " "$u"
  curl -s -A "Mozilla/5.0 Baiduspider/2.0" "https://openai2000.cn$u" | grep -oE 'class="breadcrumb"' | head -1
  echo
done

echo
echo "--- 2) /city 导航页 ---"
printf "  /city        %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city)"
printf "  /city 体积   %s 字节\n" "$(curl -s -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city | wc -c)"
printf "  在 sitemap   %s\n" "$(grep -c '/city' $D/sitemap.xml)"

echo
echo "--- 3) 404 无 canonical ---"
curl -s -A "Mozilla/5.0 Baiduspider/2.0" https://openai2000.cn/404 2>/dev/null | grep -c 'canonical' | sed 's/^/  404.html canonical 数: /'
grep -c 'canonical' $D/404.html | sed 's/^/  磁盘 404.html canonical 数: /'

echo
echo "--- 4) sitemap ---"
echo "  总数: $(grep -c '<loc>' $D/sitemap.xml)"
echo "  含 /city: $(grep -c '/city' $D/sitemap.xml)"
echo "  含 /solutions: $(grep -c '/solutions' $D/sitemap.xml)"
echo "  含子域: $(grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' $D/sitemap.xml | wc -l)"

echo
echo "--- 5) 案例页相关案例内链 ---"
for id in 1 4 5; do
  H=$(curl -s -A "Mozilla/5.0 Baiduspider/2.0" "https://openai2000.cn/cases/$id")
  printf "  /cases/%-4s 相关案例块=%s  案例链接=%s  字数=%s\n" "$id" \
    "$(echo "$H" | grep -c '相关案例')" \
    "$(echo "$H" | grep -oE 'href="https://openai2000.cn/cases/[0-9]+"' | wc -l)" \
    "$(echo "$H" | python3 -c "
import sys,re
h=sys.stdin.read(); h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()))
")"
done

echo
echo "--- 6) 懒加载 ---"
python3 - <<'PY'
import re, glob
D='/data/web/huizhiyunma/frontend/dist'
tot=0;nolazy=0
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'<img\b[^>]*>',h):
        tot+=1
        if 'loading=' not in m.group(0): nolazy+=1
print(f'  img 总数 {tot}，无 loading {nolazy}')
PY

echo
echo "--- 7) 内链健康度复检 ---"
python3 - <<'PY' > /tmp/lk2.txt
import re, glob, os, json, subprocess, concurrent.futures
D='/data/web/huizhiyunma/frontend/dist'
links={}
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'href="https://openai2000\.cn(/[^"#?]*)"', h):
        links.setdefault(m.group(1),set()).add(os.path.relpath(f,D))
def chk(u):
    r=subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code}','-A','Mozilla/5.0 Baiduspider/2.0','https://openai2000.cn'+u],capture_output=True,text=True,timeout=25)
    return u,r.stdout.strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for u,c in ex.map(chk, links.keys()):
        print(f'{c}\t{u}\t{len(links[u])}')
PY
echo "  目标总数: $(wc -l < /tmp/lk2.txt)"
echo "  200: $(awk -F'\t' '$1=="200"' /tmp/lk2.txt | wc -l)"
echo "  301: $(awk -F'\t' '$1=="301"' /tmp/lk2.txt | wc -l)"
echo "  其他: $(awk -F'\t' '$1!="200" && $1!="301"' /tmp/lk2.txt | wc -l)"
echo "  非200明细:"
awk -F'\t' '$1!="200" {print "    "$1" "$2" (来源 "$3" 页)"}' /tmp/lk2.txt | head -20

echo
echo "--- 8) 正文体量 ---"
for u in / /services /cases /about /templates /packages /contact /articles /solutions /city; do
  printf "  %-12s %5s 字\n" "$u" "$(curl -s -A 'Mozilla/5.0 Baiduspider/2.0' "https://openai2000.cn$u" | python3 -c "
import sys,re
h=sys.stdin.read(); h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()))
")"
done

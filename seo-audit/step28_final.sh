#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-)
ALIVE=$(mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e "SELECT id FROM articles WHERE status=1;" 2>/dev/null | tr '\n' ' ')

echo "=== 清理下架文章残留静态文件（需 root，mv 到备份区）==="
BK=/data/disk/backups/huizhiyunma_merged_statics_$(date +%Y%m%d_%H%M%S)
mkdir -p $BK
MOVED=0
for f in $D/seo/articles/*.html; do
  id=$(basename $f .html)
  if ! echo " $ALIVE " | grep -qw "$id"; then
    mv "$f" $BK/ 2>/dev/null && MOVED=$((MOVED+1))
  fi
done
chown -R www-data:www-data $D/seo/articles $BK 2>/dev/null
echo "  已移走 $MOVED 个 → $BK"
echo "  剩余文章静态页: $(ls $D/seo/articles/*.html 2>/dev/null | wc -l)"

echo
echo "=== 301 兜底仍生效（文件已移走）==="
for id in 12 21 13 76; do
  printf "  /articles/%-4s %s -> %s\n" "$id" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/articles/$id)" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/articles/$id)"
done

echo
echo "=== 内链终检（应 0 个 301/404）==="
python3 - <<'PY' > /tmp/lk4.txt
import re, glob, os, subprocess, concurrent.futures
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
    for u,c in ex.map(chk, links.keys()): print(f'{c}\t{u}\t{len(links[u])}')
PY
echo "  总数 $(wc -l < /tmp/lk4.txt) | 200: $(awk -F'\t' '$1=="200"' /tmp/lk4.txt | wc -l) | 非200: $(awk -F'\t' '$1!="200"' /tmp/lk4.txt | wc -l)"
awk -F'\t' '$1!="200" {print "    "$1" "$2" (来源 "$3" 页)"}' /tmp/lk4.txt

echo
echo "=== IndexNow 推送 ==="
bash /data/web/huizhiyunma/backend/seo/push_indexnow.sh all 2>&1 | tail -3
KEY=$(cat /data/web/huizhiyunma/backend/seo/indexnow_key.txt)
python3 - "$KEY" <<'PYEOF'
import json, sys, urllib.request, urllib.error
key = sys.argv[1]
for sd in ['qingdao', 'jinan']:
    urls = [f'https://{sd}.openai2000.cn' + p for p in ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact']]
    p = json.dumps({'host': f'{sd}.openai2000.cn', 'key': key,
                    'keyLocation': f'https://openai2000.cn/{key}.txt', 'urlList': urls}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=p,
        headers={'Content-Type': 'application/json; charset=utf-8'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(f'  ✅ {sd}: {r.status} ({len(urls)} 条)')
    except urllib.error.HTTPError as e:
        print(f'  ❌ {sd}: HTTP {e.code}')
    except Exception as e:
        print(f'  ❌ {sd}: {e}')
PYEOF

echo
echo "=== 最终状态汇总 ==="
echo "  sitemap: $(curl -s https://openai2000.cn/sitemap.xml | grep -c '<loc>') 条"
echo "  文章页: $(ls $D/seo/articles/*.html | wc -l) 个 (原 124，已下架 50)"
echo "  案例页: $(ls $D/seo/cases/*.html | wc -l) 个"
echo "  行业页: $(ls $D/solutions/*.html | wc -l) 个"
echo "  白名单城市 robots: $(find $D/city -maxdepth 2 -name robots.txt | wc -l) 个"

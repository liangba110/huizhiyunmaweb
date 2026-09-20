#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist

echo "=== 1) /articles/12 的 19 个来源页是谁 ==="
python3 - <<'PY'
import re, glob, os
D='/data/web/huizhiyunma/frontend/dist'
src=[]
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    if re.search(r'href="https://openai2000\.cn/articles/12"', h):
        src.append(os.path.relpath(f,D))
print(f'  共 {len(src)} 页:')
for s in sorted(src)[:25]: print('    '+s)
PY

echo
echo "=== 2) 磁盘上已下架文章的残留静态文件 ==="
export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-)
ALIVE=$(mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e "SELECT id FROM articles WHERE status=1;" 2>/dev/null | tr '\n' ' ')
CNT=0
for f in $D/seo/articles/*.html; do
  id=$(basename $f .html)
  if ! echo " $ALIVE " | grep -qw "$id"; then CNT=$((CNT+1)); fi
done
echo "  磁盘文件 $(ls $D/seo/articles/*.html | wc -l) 个，其中已下架残留 $CNT 个（均已被 301 屏蔽）"

echo
echo "=== 3) 存活页面是否引用了下架文章 ==="
python3 - <<'PY'
import re, glob, os, subprocess
D='/data/web/huizhiyunma/frontend/dist'
DBPWD=[l.split('=',1)[1].strip() for l in open('/data/web/huizhiyunma/backend/.env') if l.startswith('DB_PASSWORD=')][0]
alive=set(subprocess.run(['mysql','-h127.0.0.1','-uhuizhiyunma','huizhiyunma_db','-N','-e',
    'SELECT id FROM articles WHERE status=1;'],capture_output=True,text=True,
    env={'MYSQL_PWD':DBPWD,'PATH':'/usr/bin:/bin'}).stdout.split())
alive={int(x) for x in alive if x.strip().isdigit()}
bad=[]
for f in glob.glob(D+'/*.html')+glob.glob(D+'/solutions/*.html')+glob.glob(D+'/seo/articles/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    rel=os.path.relpath(f,D)
    # 跳过已下架文章自身的文件（它们会被 301，不参与索引）
    m=re.match(r'seo/articles/(\d+)\.html', rel)
    if m and int(m.group(1)) not in alive: continue
    for mm in re.finditer(r'href="https://openai2000\.cn/articles/(\d+)"', h):
        if int(mm.group(1)) not in alive:
            bad.append((rel, mm.group(1)))
print(f'  存活页面中指向下架文章的链接: {len(bad)} 处')
for r,i in bad[:15]: print(f'    {r} → /articles/{i}')
PY

echo
echo "=== 4) 清理下架文章残留静态文件（移到备份，不删除）==="
BK=/data/disk/backups/huizhiyunma_merged_statics_$(date +%Y%m%d_%H%M%S)
mkdir -p $BK
MOVED=0
for f in $D/seo/articles/*.html; do
  id=$(basename $f .html)
  if ! echo " $ALIVE " | grep -qw "$id"; then
    mv "$f" $BK/ && MOVED=$((MOVED+1))
  fi
done
echo "  已移走 $MOVED 个文件 → $BK"
echo "  剩余文章静态页: $(ls $D/seo/articles/*.html 2>/dev/null | wc -l)"

echo
echo "=== 5) 301 规则仍有效（文件移走后靠 nginx 301 兜底）==="
for id in 12 21 13; do
  printf "  /articles/%-4s %s -> %s\n" "$id" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/articles/$id)" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/articles/$id)"
done

echo
echo "=== 6) 全站内链终检 ==="
python3 - <<'PY' > /tmp/lk3.txt
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
    for u,c in ex.map(chk, links.keys()): print(f'{c}\t{u}\t{len(links[u])}')
PY
echo "  目标总数 $(wc -l < /tmp/lk3.txt)"
echo "  200: $(awk -F'\t' '$1=="200"' /tmp/lk3.txt | wc -l)"
echo "  301: $(awk -F'\t' '$1=="301"' /tmp/lk3.txt | wc -l)"
echo "  非200/301: $(awk -F'\t' '$1!="200" && $1!="301"' /tmp/lk3.txt | wc -l)"
awk -F'\t' '$1!="200" && $1!="301" {print "    !! "$1" "$2}' /tmp/lk3.txt
echo "  301 明细（应仅剩 nginx 兜底的旧文章）:"
awk -F'\t' '$1=="301" {print "    "$2" (来源 "$3" 页)"}' /tmp/lk3.txt

echo
echo "=== 7) 关键页面状态 ==="
for u in / /services /cases /about /templates /packages /articles /contact /solutions /city /solutions/catering /articles/page/2 /articles/9 /cases/1; do
  printf "  %-22s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn$u)"
done

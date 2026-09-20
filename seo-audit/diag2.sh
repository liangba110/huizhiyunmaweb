#!/bin/bash
S="https://openai2000.cn"

echo "=== 1) 各 UA 在 /services 拿到什么（判断 H1 缺失影响面）==="
for ua in \
  "Mozilla/5.0 (compatible; Baiduspider/2.0)" \
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  "Mozilla/5.0 (compatible; bingbot/2.0)" \
  "Mozilla/5.0 (compatible; ChatGPT-User/1.0)" \
  "Mozilla/5.0 (compatible; PerplexityBot/1.0)" \
  "Mozilla/5.0 (compatible; YandexBot/3.0)" \
  "Mozilla/5.0 (compatible; Sogou web spider/4.0)" \
  "Mozilla/5.0 (compatible; 360Spider)" \
  "facebookexternalhit/1.1" \
  "Twitterbot/1.0" \
  "Mozilla/5.0 (compatible; Bytespider)" \
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile" ; do
  R=$(curl -s -A "$ua" "$S/services")
  printf "  %-52s size=%-6s h1=%s\n" "$(echo $ua | cut -c1-50)" "${#R}" "$(echo "$R" | grep -c '<h1')"
done

echo
echo "=== 2) 浏览器 UA 拿到的 /services（SPA 壳）+ 是否有 H1 ==="
R=$(curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131" "$S/services")
echo "  size=${#R}  h1=$(echo "$R" | grep -c '<h1')"
echo "$R" | grep -oE '<title>[^<]*</title>|<div id="app"' | sed 's/^/    /'

echo
echo "=== 3) description 过短的页面清单（<60字符）==="
python3 - <<'PY'
import re, glob, os
D='/data/web/huizhiyunma/frontend/dist'
out=[]
for f in sorted(glob.glob(D+'/*.html')):
    h=open(f,encoding='utf-8',errors='ignore').read()
    d=re.search(r'<meta name="description" content="(.*?)"',h,re.S)
    d=d.group(1).strip() if d else ''
    if len(d)<60: out.append((len(d), os.path.basename(f), d))
for n,f,d in out: print(f'  {n:3d}  {f:22s} {d}')
PY

echo
echo "=== 4) 文章页「相关阅读」内链现状 ==="
for id in 9 24 32; do
  H=$(curl -s -A "Mozilla/5.0 Baiduspider/2.0" "$S/articles/$id")
  printf "  /articles/%-4s → 站内链接 %s 个，相关文章链接 %s 个，唯一目标 %s 个\n" "$id" \
    "$(echo "$H" | grep -oE 'href="https://openai2000.cn/[^"]*"' | wc -l)" \
    "$(echo "$H" | grep -oE 'href="https://openai2000.cn/articles/[0-9]+"' | wc -l)" \
    "$(echo "$H" | grep -oE 'href="https://openai2000.cn/[^"]*"' | sort -u | wc -l)"
done

echo
echo "=== 5) 旧合并文章静态文件是否仍在（应已 301 屏蔽）==="
echo "  /seo/articles/ 文件数: $(ls /data/web/huizhiyunma/frontend/dist/seo/articles/*.html 2>/dev/null | wc -l)"
echo "  DB 已发布文章数: $(export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-); mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e 'SELECT COUNT(*) FROM articles WHERE status=1' 2>/dev/null)"
echo "  抽查 21.html 是否可访问: $(curl -s -o /dev/null -w '%{http_code}' $S/seo/articles/21.html)"

echo
echo "=== 6) 首页 / 栏目页 内容块结构（看是否缺 H1 相关区块）==="
for u in /services /about /templates /packages; do
  H=$(curl -s -A "Mozilla/5.0 Baiduspider/2.0" "$S$u")
  printf "  %-12s h1=%s h2=%s h3=%s 正文元=%s\n" "$u" \
    "$(echo "$H" | grep -c '<h1')" "$(echo "$H" | grep -c '<h2')" "$(echo "$H" | grep -c '<h3')" \
    "$(echo "$H" | grep -c '<p')"
done

echo
echo "=== 7) 图片懒加载 / 尺寸属性检查 ==="
python3 - <<'PY'
import re, glob
D='/data/web/huizhiyunma/frontend/dist'
tot=0; nolazy=0; nosize=0
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'<img\b[^>]*>', h):
        s=m.group(0); tot+=1
        if 'loading=' not in s: nolazy+=1
        if 'width=' not in s or 'height=' not in s: nosize+=1
print(f'  img 总数 {tot}，无 loading 属性 {nolazy}，无 width/height {nosize}')
PY

echo
echo "=== 8) 站点地图 lastmod / 索引提交入口 ==="
for s in sitemap.xml sitemap-articles.xml sitemap-cases.xml; do
  printf "  %-22s %s 条  lastmod=%s\n" "$s" "$(curl -s $S/$s | grep -c '<loc>')" "$(curl -s $S/$s | grep -oE '<lastmod>[^<]*' | head -1 | cut -d'>' -f2)"
done

echo
echo "=== 9) HTML 体积最大页面 ==="
ls -S /data/web/huizhiyunma/frontend/dist/*.html | head -5 | while read f; do
  echo "  $(wc -c < $f)  $(basename $f)"
done

echo
echo "=== 10) 是否有 404 页面链接被引用 ==="
curl -s -A "Mozilla/5.0 Baiduspider/2.0" "$S/" | grep -oE 'href="[^"]*"' | sort -u | head -25 | sed 's/^/  /'

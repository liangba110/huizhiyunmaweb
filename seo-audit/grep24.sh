#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== cityPage 函数 ==="
S=$(grep -n "^function cityPage" $G | cut -d: -f1)
E=$(awk -v s=$S 'NR>s && /^}/{print NR; exit}' $G)
echo "起 $S 止 $E"
awk -v s=$S -v e=$E 'NR>=s && NR<=e {printf "%d|%s\n", NR, $0}' $G

echo
echo "=== 城市 robots/sitemap 生成段 ==="
grep -n "robots.txt\|sitemap.xml" $G | sed -n '1,40p'

echo
echo "=== 线上实测：非白名单城市其他页面 robots ==="
for u in "" services about cases contact packages articles templates; do
  printf "  beijing/%-11s " "$u"
  curl -s -A 'Mozilla/5.0 Chrome/131' "https://beijing.openai2000.cn/$u" | grep -oE '<meta name="robots"[^>]*>' | head -1
  echo
done

#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 所有 '<main>' 行 ==="
grep -n "'<main>'" $G
echo
echo "=== 1295-1310 (cityPage 报错处) ==="
awk 'NR>=1295 && NR<=1310 {printf "%d|%s\n", NR, $0}' $G
echo
echo "=== seoPage 的 main 行上下文 ==="
grep -n "bcHtml" $G
echo
echo "=== cityPage 函数签名与 opts ==="
S=$(grep -n "^function cityPage" $G | cut -d: -f1)
awk -v s=$S 'NR>=s && NR<=s+16 {printf "%d|%s\n", NR, $0}' $G
echo
echo "=== nginx city rewrite 位置 ==="
grep -n "city" /etc/nginx/sites-enabled/huizhiyunma | grep -v 'subdomain\|cityDir\|city.html break' | head
grep -n 'rewrite ^/city' /etc/nginx/sites-enabled/huizhiyunma

#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== seoPage 内 main 相关（搜 main）==="
grep -n "main>" $G
echo
echo "=== seoPage 250-345 ==="
awk 'NR>=286 && NR<=345 {printf "%d|%s\n", NR, $0}' $G
echo
echo "=== nginx 78-92 ==="
awk 'NR>=78 && NR<=92 {printf "%d|%s\n", NR, $0}' /etc/nginx/sites-enabled/huizhiyunma

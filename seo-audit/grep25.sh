#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 1589-1615 (城市 robots/sitemap 生成) ==="
awk 'NR>=1589 && NR<=1615 {printf "%d|%s\n", NR, $0}' $G
echo
echo "=== extra 赋值行 ==="
grep -n "var extra = " $G

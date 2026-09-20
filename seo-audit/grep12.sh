#!/bin/bash
echo "=== 当前 articles/page 规则 ==="
grep -n "articles/page" /etc/nginx/sites-enabled/huizhiyunma
echo
echo "=== 浏览器段 try_files ==="
awk 'NR>=152 && NR<=168 {printf "%d|%s\n", NR, $0}' /etc/nginx/sites-enabled/huizhiyunma

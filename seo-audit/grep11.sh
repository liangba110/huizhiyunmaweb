#!/bin/bash
GEN=/etc/nginx/sites-enabled/huizhiyunma
echo "=== articles 相关 location ==="
grep -n "articles" $GEN | head -30
echo
echo "=== 静态页 rewrite 段 ==="
grep -n "rewrite.*\.html\|try_files" $GEN | head -25

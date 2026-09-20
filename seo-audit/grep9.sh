#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 1355-1372 ==="
awk 'NR>=1355 && NR<=1372 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== 1500-1525 ==="
awk 'NR>=1500 && NR<=1525 {printf "%d|%s\n", NR, $0}' $GEN

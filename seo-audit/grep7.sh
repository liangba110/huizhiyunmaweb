#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 静态页数组 (1315-1345) ==="
awk 'NR>=1315 && NR<=1345 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== 主流程 1380-1440 ==="
awk 'NR>=1380 && NR<=1440 {printf "%d|%s\n", NR, $0}' $GEN

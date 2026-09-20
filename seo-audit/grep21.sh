#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 1440-1500 (城市页循环) ==="
awk 'NR>=1440 && NR<=1500 {printf "%d|%s\n", NR, $0}' $G
echo
echo "=== 1500-1560 ==="
awk 'NR>=1500 && NR<=1560 {printf "%d|%s\n", NR, $0}' $G

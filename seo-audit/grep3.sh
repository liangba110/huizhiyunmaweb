#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 1644-1660 ==="
awk 'NR>=1644 && NR<=1660 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== 1975-1990 ==="
awk 'NR>=1975 && NR<=1990 {printf "%d|%s\n", NR, $0}' $GEN

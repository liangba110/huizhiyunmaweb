#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== cityLocalBlock 引用点 ==="
grep -n "cityLocalBlock" $G
echo
echo "=== cityHomeBody 函数 ==="
S=$(grep -n "function cityHomeBody" $G | cut -d: -f1)
E=$(awk -v s=$S 'NR>s && /^}/{print NR; exit}' $G)
echo "起 $S 止 $E"
awk -v s=$S -v e=$E 'NR>=s && NR<=e {printf "%d|%s\n", NR, $0}' $G

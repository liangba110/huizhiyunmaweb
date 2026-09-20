#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
S=$(grep -n "^function articlesBody" $GEN | cut -d: -f1)
E=$(awk -v s=$S 'NR>s && /^}/{print NR; exit}' $GEN)
echo "articlesBody: 起 $S 止 $E"
awk -v s=$S -v e=$E 'NR>=s && NR<=e {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== 静态页生成调用处（articles.html）==="
grep -n "articles.html\|articlesBody(" $GEN
echo
echo "=== $DIST 与 SITE 定义 ==="
grep -n "^const DIST\|^const SITE\|var DIST\|var SITE" $GEN | head

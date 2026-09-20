#!/bin/bash
echo "=== 找 node ==="
ls /www/server/nodejs/ 2>/dev/null
find / -maxdepth 5 -name 'node' -type f -perm -u+x 2>/dev/null | grep -v node_modules | head -10
echo
SEODIR=/data/web/huizhiyunma/backend/seo
echo "=== run_generate_article.sh ==="
cat $SEODIR/run_generate_article.sh 2>/dev/null
echo "=== run_case_daily.sh ==="
cat $SEODIR/run_case_daily.sh 2>/dev/null
echo
echo "=== .env 里的 DB 是否可连 (用哪个 node) ==="
NODE=$(find /www/server/nodejs -maxdepth 3 -name node -type f 2>/dev/null | head -1)
echo "NODE=$NODE"

#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== caseBody 函数 ==="
S=$(grep -n "^function caseBody" $G | cut -d: -f1)
E=$(awk -v s=$S 'NR>s && /^}/{print NR; exit}' $G)
echo "起 $S 止 $E"
awk -v s=$S -v e=$E 'NR>=s && NR<=e {printf "%d|%s\n", NR, $0}' $G

echo
echo "=== 9 个薄案例的实际字段 ==="
export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-)
mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -e \
 "SELECT id, LEFT(title,30) t, category, LEFT(client,16) cl, CHAR_LENGTH(description) dl, CHAR_LENGTH(IFNULL(content,'')) clen FROM cases WHERE status=1 AND id IN (4,5,7,8,9,10) ORDER BY id;" 2>/dev/null

echo
echo "=== cases 表结构 ==="
mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e "DESCRIBE cases;" 2>/dev/null | awk '{printf "  %-18s %s\n", $1, $2}'

echo
echo "=== cityNavBody 链接数 + city.html ==="
grep -oE 'href="https://[a-z0-9-]+\.openai2000\.cn/"' /data/web/huizhiyunma/frontend/dist/city.html | wc -l
echo "  city.html 是否在 sitemap: $(grep -c '/city' /data/web/huizhiyunma/frontend/dist/sitemap.xml)"

echo
echo "=== 薄案例正文片段（id=4）==="
python3 -c "
import re
h=open('/data/web/huizhiyunma/frontend/dist/seo/cases/4.html',encoding='utf-8').read()
h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()[:900])
"

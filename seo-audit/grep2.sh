#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== industryBody 结尾附近 ==="
grep -n "return parts.join" $GEN
echo
echo "=== 行业数据定义锚点 ==="
grep -n "行业数据定义" $GEN
echo
echo "=== INDUSTRY_EXTRA 是否插入成功 ==="
grep -n "INDUSTRY_EXTRA" $GEN | head
echo
echo "=== 1301+ 行区域（industryBody 结尾）==="
sed -n '1350,1370p' $GEN | cat -A | sed 's/\$$//' | head -25

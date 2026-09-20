#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== jsonLd: orgJsonLd(info) 附近（行业页）==="
grep -n "jsonLd: orgJsonLd(info)" $GEN
echo
echo "=== IndustryPages 内 jsonLd 行 ==="
S=$(grep -n "function generateIndustryPages" $GEN | cut -d: -f1)
awk -v s=$S 'NR>=s && NR<=s+30 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== jsonLdExtra 残留 ==="
grep -n "jsonLdExtra" $GEN

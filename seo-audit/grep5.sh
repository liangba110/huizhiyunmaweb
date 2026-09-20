#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 首页 body 全文 (345-382) ==="
awk 'NR>=345 && NR<=382 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== breadcrumbSchema 使用处 ==="
grep -n "breadcrumbSchema" $GEN
echo
echo "=== 内链检查（宽松）==="
echo "packages 链接:"; grep -c "packages\"" $GEN
echo "services 链接:"; grep -c "SITE}/services" $GEN
echo
echo "=== 百度推送脚本 ==="
ls -la /data/web/huizhiyunma/backend/seo/push_baidu.sh /data/web/huizhiyunma/scripts/baidu_push.sh 2>&1
echo
echo "=== push_baidu.sh 内容 ==="
cat /data/web/huizhiyunma/backend/seo/push_baidu.sh 2>/dev/null | head -30

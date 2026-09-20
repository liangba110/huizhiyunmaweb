#!/bin/bash
echo "=== 全站 IndexNow 推送（含新增 solutions + 分页页）==="
bash /data/web/huizhiyunma/backend/seo/push_indexnow.sh all 2>&1 | tail -8
echo
echo "=== 日志尾部 ==="
tail -5 /data/web/huizhiyunma/backend/seo/push_indexnow.log
echo
echo "=== 本次推送 URL 数 ==="
wc -l < /data/web/huizhiyunma/backend/seo/.push_tmp/indexnow_urls.txt
echo
echo "=== 抽样确认新 URL 在列表中 ==="
for u in solutions/catering articles/page/2 services about; do
  printf "  %-24s %s\n" "$u" "$(grep -c "$u$" /data/web/huizhiyunma/backend/seo/.push_tmp/indexnow_urls.txt)"
done

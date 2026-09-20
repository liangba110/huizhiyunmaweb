#!/bin/bash
echo "=== IndexNow 脚本 ==="
cat /data/web/huizhiyunma/backend/seo/push_indexnow.sh
echo
echo "=== IndexNow 日志尾部 ==="
tail -15 /data/web/huizhiyunma/backend/seo/push_indexnow.log 2>/dev/null || echo "(无)"

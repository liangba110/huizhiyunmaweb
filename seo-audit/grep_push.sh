#!/bin/bash
D=/data/web/huizhiyunma/backend/seo
echo "=== push_baidu.sh 全文 ==="
cat $D/push_baidu.sh
echo
echo "=== 最近推送日志 ==="
tail -20 $D/push_baidu.log 2>/dev/null || echo "(无日志)"

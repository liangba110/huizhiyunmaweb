#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 指向 /packages 的链接数（源文件）==="
grep -o "SITE + '/packages'" $GEN | wc -l
echo
echo "=== articlesBody 函数 ==="
awk 'NR>=382 && NR<=400 {printf "%d|%s\n", NR, $0}' $GEN
echo
echo "=== 首页 body ==="
awk 'NR>=323 && NR<=352 {printf "%d|%s\n", NR, $0}' $GEN | head -35
echo
echo "=== 百度推送相关 ==="
grep -rn "push\|baidu" /data/web/huizhiyunma/backend/seo/*.js /data/web/huizhiyunma/backend/*.js 2>/dev/null | grep -iv "baidu-site-verification" | head -10
echo
echo "=== crontab ==="
crontab -l 2>/dev/null | head -20

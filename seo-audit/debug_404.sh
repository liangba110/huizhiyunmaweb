#!/bin/bash
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"

echo "=== 404 页面完整内容 ==="
curl -s -A "$C" https://qingdao.openai2000.cn/cases/1
echo
echo "---"
echo "=== 响应头 ==="
curl -s -I -A "$C" https://qingdao.openai2000.cn/cases/1

echo
echo "=== nginx error_page / 404 配置 ==="
grep -n "error_page\|404" /etc/nginx/sites-enabled/huizhiyunma | head -20

echo
echo "=== 主站 404 对照 ==="
printf "  主站 /cases/99999: %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" https://openai2000.cn/cases/99999)"
printf "  主站 /nonexistent: %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" https://openai2000.cn/nonexistent-xyz)"

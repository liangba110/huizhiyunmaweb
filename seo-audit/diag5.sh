#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 1) seoPage head 生成 ==="
S=$(grep -n "^function seoPage" $G | cut -d: -f1)
awk -v s=$S 'NR>=s && NR<=s+42 {printf "%d|%s\n", NR, $0}' $G

echo
echo "=== 2) 文章页相关阅读函数 ==="
grep -n "function articleBody\|相关阅读\|relatedArticles\|related" $G | head -15

echo
echo "=== 3) /city 路由现状 ==="
printf "  /city     : %s -> %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city)" "$(curl -s -o /dev/null -w '%{redirect_url}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city)"
printf "  /city/    : %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city/)"
printf "  /city.html: %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' https://openai2000.cn/city.html)"
echo
echo "  主站 nginx 中 city 相关 rewrite:"
grep -n "city" /etc/nginx/sites-enabled/huizhiyunma | grep -v subdomain | head -12

echo
echo "=== 4) 404.html 头部 ==="
head -20 /data/web/huizhiyunma/frontend/dist/404.html

echo
echo "=== 5) 文章页现有内链结构 ==="
S2=$(grep -n "function articleBody" $G | cut -d: -f1)
awk -v s=$S2 'NR>=s && NR<=s+35 {printf "%d|%s\n", NR, $0}' $G

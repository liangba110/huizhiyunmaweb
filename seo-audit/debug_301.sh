#!/bin/bash
echo "=== 301 Location 目标 ==="
for u in cases articles; do
  printf "  yantai/%-9s -> " "$u"
  curl -s -o /dev/null -w "%{redirect_url}\n" -A 'Mozilla/5.0 Chrome/131' "https://yantai.openai2000.cn/$u"
done
printf "  qingdao/cases -> "
curl -s -o /dev/null -w "%{redirect_url}\n" -A 'Mozilla/5.0 Chrome/131' "https://qingdao.openai2000.cn/cases"

echo
echo "=== seo-redirects.conf 中含 cases/articles 精确匹配的行 ==="
grep -nE "location\s*=?\s*\^?/?(cases|articles)/?\\\$?" /etc/nginx/seo-redirects.conf | head -20

echo
echo "=== seo-redirects.conf 前 10 行 ==="
head -10 /etc/nginx/seo-redirects.conf

echo
echo "=== seo-redirects.conf 中所有 location 形式统计 ==="
grep -c 'location' /etc/nginx/seo-redirects.conf
echo "--- location 模式样例 ---"
grep 'location' /etc/nginx/seo-redirects.conf | head -5
grep 'location' /etc/nginx/seo-redirects.conf | tail -5

echo
echo "=== include 位置 ==="
grep -n "seo-redirects" /etc/nginx/sites-enabled/huizhiyunma
grep -n "seo-redirects" /etc/nginx/nginx.conf 2>/dev/null

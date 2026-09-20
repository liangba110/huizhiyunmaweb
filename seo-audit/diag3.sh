#!/bin/bash
S="https://openai2000.cn"

echo "=== 1) 首页内链指向的文章 ID 健康度 ==="
for id in 1 2 3 4 5 6 9 11 12 13 14 15 16; do
  printf "  /articles/%-4s %s %s\n" "$id" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' $S/articles/$id)" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' -A 'Mozilla/5.0 Baiduspider/2.0' $S/articles/$id)"
done

echo
echo "=== 2) 首页案例内链健康度 ==="
for id in 11 12 13 14 15 16; do
  printf "  /cases/%-4s %s %s\n" "$id" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 Baiduspider/2.0' $S/cases/$id)" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' -A 'Mozilla/5.0 Baiduspider/2.0' $S/cases/$id)"
done

echo
echo "=== 3) seo.css 可达性 ==="
printf "  %s\n" "$(curl -s -o /dev/null -w '%{http_code} %{size_download}B' $S/seo.css)"

echo
echo "=== 4) DB 中实际保留（status=1）的文章 ID 列表 ==="
export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-)
mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e "SELECT GROUP_CONCAT(id ORDER BY id) FROM articles WHERE status=1;" 2>/dev/null | tr ',' ' ' | fold -w 100 | sed 's/^/  /'

echo
echo "=== 5) 被 301 的文章 ID ==="
grep -oE 'location = /articles/[0-9]+' /etc/nginx/seo-redirects.conf | grep -oE '[0-9]+' | sort -n | uniq | tr '\n' ' ' | fold -w 100 | sed 's/^/  /'

echo
echo "=== 6) 首页正文中的文章链接（从 index.seo.html 提取）==="
grep -oE 'href="https://openai2000.cn/articles/[0-9]+"' /data/web/huizhiyunma/frontend/dist/index.seo.html | grep -oE '[0-9]+' | sort -un | tr '\n' ' '
echo
echo "=== 7) 首页正文中的案例链接 ==="
grep -oE 'href="https://openai2000.cn/cases/[0-9]+"' /data/web/huizhiyunma/frontend/dist/index.seo.html | grep -oE '[0-9]+' | sort -un | tr '\n' ' '
echo
echo "=== 8) articles.html 中的链接 ID ==="
grep -oE 'href="https://openai2000.cn/articles/[0-9]+"' /data/web/huizhiyunma/frontend/dist/articles.html | grep -oE '[0-9]+' | sort -un | tr '\n' ' '
echo
echo "=== 9) cases.html 中的链接 ID ==="
grep -oE 'href="https://openai2000.cn/cases/[0-9]+"' /data/web/huizhiyunma/frontend/dist/cases.html | grep -oE '[0-9]+' | sort -un | tr '\n' ' '

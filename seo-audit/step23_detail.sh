#!/bin/bash
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

echo "=== 城市详情页（正确 URL 构造）==="
for c in qingdao yantai; do
  for u in "cases/1" "articles/9" "cases/5"; do
    printf "  %-18s " "$c/$u"
    curl -s -o /dev/null -w "code=%{http_code} size=%{size_download}\n" -A "$B" "https://$c.openai2000.cn/$u"
  done
done

echo
echo "=== 磁盘上城市详情页是否存在 ==="
for c in qingdao yantai; do
  echo "  [$c]"
  ls /data/web/huizhiyunma/frontend/dist/city/$c/cases/ 2>/dev/null | wc -l | sed 's/^/    cases\/ 文件数: /'
  ls /data/web/huizhiyunma/frontend/dist/city/$c/articles/ 2>/dev/null | wc -l | sed 's/^/    articles\/ 文件数: /'
done

echo
echo "=== 详情页 robots meta ==="
for c in qingdao yantai; do
  printf "  %-9s cases/1   %s\n" "$c" "$(curl -s -A "$C" "https://$c.openai2000.cn/cases/1" | grep -oE 'content="(no)?index[^"]*"' | head -1)"
  printf "  %-9s articles/9 %s\n" "$c" "$(curl -s -A "$C" "https://$c.openai2000.cn/articles/9" | grep -oE 'content="(no)?index[^"]*"' | head -1)"
done

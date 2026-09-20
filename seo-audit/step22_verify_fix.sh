#!/bin/bash
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

echo "=== 修复后：城市子域全路径矩阵（浏览器 UA）==="
for c in yantai qingdao jinan beijing; do
  echo "  [$c]"
  for u in "" services cases articles about templates packages contact; do
    R=$(curl -s -o /dev/null -w '%{http_code}' -A "$C" "https://$c.openai2000.cn/$u")
    M=$(curl -s -A "$C" "https://$c.openai2000.cn/$u" | grep -oE 'content="(no)?index[^"]*"' | head -1)
    printf "    %-11s %s  %s\n" "/$u" "$R" "$M"
  done
done

echo
echo "=== 修复后：爬虫 UA ==="
for c in yantai qingdao; do
  echo "  [$c]"
  for u in "" cases articles services; do
    R=$(curl -s -o /dev/null -w '%{http_code}' -A "$B" "https://$c.openai2000.cn/$u")
    M=$(curl -s -A "$B" "https://$c.openai2000.cn/$u" | grep -oE 'content="(no)?index[^"]*"' | head -1)
    printf "    %-11s %s  %s\n" "/$u" "$R" "$M"
  done
done

echo
echo "=== 主站未受影响 ==="
for u in / /services /cases /articles /about /contact /solutions /articles/page/2 /articles/9 /cases/1; do
  printf "  %-20s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" "https://openai2000.cn$u")"
done

echo
echo "=== 城市详情页（爬虫）==="
for u in "yantai/cases/1" "qingdao/cases/1" "yantai/articles/9"; do
  printf "  %-22s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" "https://$u")"
done

#!/bin/bash
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

echo "=== 详情页 301 验证 ==="
for c in qingdao yantai; do
  for u in "cases/1" "articles/9"; do
    printf "  %-18s %s -> %s\n" "$c/$u" \
      "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" "https://$c.openai2000.cn/$u")" \
      "$(curl -s -o /dev/null -w '%{redirect_url}' -A "$B" "https://$c.openai2000.cn/$u")"
  done
done

echo
echo "=== 软 404 已修 ==="
for u in login xyz-nonexistent register profile; do
  printf "  qingdao/%-16s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" "https://qingdao.openai2000.cn/$u")"
done

echo
echo "=== 正常页面仍 200 ==="
for u in "" services cases articles about templates packages contact; do
  printf "  qingdao/%-11s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" "https://qingdao.openai2000.cn/$u")"
done

echo
echo "=== 主站不受影响 ==="
for u in / /services /cases /articles /about /contact /solutions /articles/page/2 /articles/9 /cases/1 /login /register /profile; do
  printf "  %-20s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" "https://openai2000.cn$u")"
done

echo
echo "=== 主站 301 去重仍正常 ==="
for id in 21 13 16; do
  printf "  /articles/%-4s %s -> %s\n" "$id" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://openai2000.cn/articles/$id)" \
    "$(curl -s -o /dev/null -w '%{redirect_url}' https://openai2000.cn/articles/$id)"
done

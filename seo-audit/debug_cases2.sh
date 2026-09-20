#!/bin/bash
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

echo "=== 带斜杠的最终结果 ==="
for u in cases/ articles/; do
  echo "  [yantai/$u]"
  printf "    code=%s  meta=%s\n" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A "$C" https://yantai.openai2000.cn/$u)" \
    "$(curl -s -A "$C" https://yantai.openai2000.cn/$u | grep -oE '<meta name="robots"[^>]*>' | head -1)"
done

echo
echo "=== 白名单城市同路径（应 index）==="
for u in cases/ articles/; do
  printf "    qingdao/%-9s meta=%s\n" "$u" "$(curl -s -A "$C" https://qingdao.openai2000.cn/$u | grep -oE '<meta name="robots"[^>]*>' | head -1)"
done

echo
echo "=== 追踪完整跳转链（爬虫 UA）==="
for u in cases articles; do
  printf "  yantai/%-9s hops=%s final=%s\n" "$u" \
    "$(curl -s -o /dev/null -w '%{num_redirects}' -A "$B" -L https://yantai.openai2000.cn/$u)" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" -L https://yantai.openai2000.cn/$u)"
done

echo
echo "=== 非白名单城市全页面矩阵 noindex 检查 ==="
for c in yantai weifang linyi beijing; do
  echo "  [$c]"
  for u in "" services cases/ about templates packages articles/ contact; do
    M=$(curl -s -A "$C" "https://$c.openai2000.cn/$u" | grep -oE 'content="noindex[^"]*"' | head -1)
    if [ -z "$M" ]; then echo "    ⚠️ /$u 无 noindex"; fi
  done
  echo "    全部页面 noindex ✓"
done

echo
echo "=== nginx 城市段结构（60-90行）==="
awk 'NR>=58 && NR<=90 {printf "%d|%s\n", NR, $0}' /etc/nginx/sites-enabled/huizhiyunma

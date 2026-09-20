#!/bin/bash
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
echo "=== 内链密度最终检查 ==="
for u in / /services /cases /about /templates /contact /articles /solutions /solutions/catering /articles/9; do
  H=$(curl -s -A "$B" "https://openai2000.cn$u")
  printf "  %-22s packages=%-3s services=%-3s solutions=%-3s cases=%-3s\n" "$u" \
    "$(echo "$H" | grep -o 'openai2000.cn/packages' | wc -l)" \
    "$(echo "$H" | grep -o 'openai2000.cn/services' | wc -l)" \
    "$(echo "$H" | grep -o 'openai2000.cn/solutions' | wc -l)" \
    "$(echo "$H" | grep -o 'openai2000.cn/cases' | wc -l)"
done
echo
echo "=== 全站可见文字量 ==="
for u in / /services /cases /about /templates /packages /contact /articles; do
  printf "  %-12s %5s 字\n" "$u" "$(curl -s -A "$B" "https://openai2000.cn$u" | python3 -c "
import sys,re
h=sys.stdin.read()
b=re.sub(r'<script.*?</script>','',h,flags=re.S)
b=re.sub(r'<style.*?</style>','',b,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b)).strip()))
")"
done
echo
echo "=== 404 检查（新增路径）---"
for u in /articles/page/2 /articles/page/3 /articles/page/4 /solutions /solutions/catering; do
  printf "  %-22s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" "https://openai2000.cn$u")"
done
echo "  越界分页 /articles/page/99: $(curl -s -o /dev/null -w '%{http_code}' -A "$B" https://openai2000.cn/articles/page/99)"

#!/bin/bash
UA="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
D=/data/web/huizhiyunma/frontend/dist/seo
echo "=== 各页正文体量（字节 / 可见文字估算）==="
for f in /services /about /templates /packages /contact /cases /articles /solutions; do
  S=$(curl -s -A "$UA" "https://openai2000.cn$f" | wc -c)
  echo "  $f  $S 字节"
done
echo
echo "=== 本地 seo 目录文件大小（前 30 小）==="
find $D -name '*.html' -printf '%s %p\n' | sort -n | head -30 | while read sz p; do
  echo "  $sz  ${p#$D/}"
done
echo
echo "=== solutions 页大小 ==="
for f in $D/solutions/*.html; do
  printf "  %-46s %s\n" "$(basename $f)" "$(wc -c < $f)"
done
echo
echo "=== case 详情页最小 5 个 ==="
find $D/cases -name '*.html' -printf '%s %p\n' | sort -n | head -5
echo
echo "=== about/contact/templates 实际内容 ==="
for f in about contact templates; do
  echo "--- $f ---"
  python3 -c "
import re,sys
h=open('$D/$f.html',encoding='utf-8').read()
b=re.sub(r'<script.*?</script>','',h,flags=re.S)
b=re.sub(r'<style.*?</style>','',b,flags=re.S)
t=re.sub(r'<[^>]+>',' ',b)
t=re.sub(r'\s+',' ',t).strip()
print('正文字符数:', len(t))
print(t[:400])
"
done

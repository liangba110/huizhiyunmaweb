#!/bin/bash
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"

echo "############ 最终验证 ############"
echo
echo "--- 1) 文章分页（爬虫）---"
for p in 2 3 4; do
  printf "  /articles/page/%s " $p
  curl -s -o /dev/null -w "code=%{http_code} size=%{size_download}\n" -A "$B" "https://openai2000.cn/articles/page/$p"
done
echo "  首页 /articles  size=$(curl -s -A "$B" https://openai2000.cn/articles | wc -c)"

echo
echo "--- 2) 分页（浏览器）---"
for p in 2 3; do
  printf "  /articles/page/%s code=" $p
  curl -s -o /dev/null -w "%{http_code}  title=" -A "$C" "https://openai2000.cn/articles/page/$p"
  curl -s -A "$C" "https://openai2000.cn/articles/page/$p" | grep -oE '<title>[^<]*</title>' | head -1
done

echo
echo "--- 3) 分类导航链接 ---"
curl -s -A "$B" https://openai2000.cn/articles | grep -oE 'href="https://openai2000.cn/articles\?cat=[^"]*"' | head -6

echo
echo "--- 4) 结构化数据 ---"
for u in / /services /solutions/catering /articles/9 /cases/1; do
  printf "  %-24s " $u
  curl -s -A "$B" "https://openai2000.cn$u" | grep -oE '"@type":"(FAQPage|BreadcrumbList|Article)"' | sort -u | tr '\n' ' '
  echo
done

echo
echo "--- 5) 行业页内容量 ---"
for s in catering logistics manufacturing; do
  printf "  /solutions/%-16s %s 字节\n" $s "$(curl -s -A "$B" https://openai2000.cn/solutions/$s | wc -c)"
done

echo
echo "--- 6) 内链（指向 packages/services/solutions）---"
for u in / /services /solutions/catering /about /contact; do
  H=$(curl -s -A "$B" "https://openai2000.cn$u")
  printf "  %-22s packages=%s services=%s solutions=%s\n" "$u" \
    "$(echo "$H" | grep -o 'openai2000.cn/packages' | wc -l)" \
    "$(echo "$H" | grep -o 'openai2000.cn/services' | wc -l)" \
    "$(echo "$H" | grep -o 'openai2000.cn/solutions' | wc -l)"
done

echo
echo "--- 7) 旧内容量对比（薄内容页）---"
for u in /about /contact /templates /services; do
  printf "  %-12s %s 字\n" $u "$(curl -s -A "$B" "https://openai2000.cn$u" | python3 -c "
import sys,re
h=sys.stdin.read()
b=re.sub(r'<script.*?</script>','',h,flags=re.S)
b=re.sub(r'<style.*?</style>','',b,flags=re.S)
t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b)).strip()
print(len(t))
")"
done

echo
echo "--- 8) sitemap 总览 ---"
echo "  sitemap.xml:          $(curl -s https://openai2000.cn/sitemap.xml | grep -c '<loc>')"
echo "  含子域 URL:           $(curl -s https://openai2000.cn/sitemap.xml | grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' | wc -l)"
echo "  sitemap-articles.xml: $(curl -s https://openai2000.cn/sitemap-articles.xml | grep -c '<loc>')"
echo "  sitemap-cases.xml:    $(curl -s https://openai2000.cn/sitemap-cases.xml | grep -c '<loc>')"

echo
echo "--- 9) 城市站白名单校验 ---"
echo "  白名单 qingdao robots: $(curl -s -o /dev/null -w '%{http_code}' https://qingdao.openai2000.cn/robots.txt)"
echo "  非白名单beijing robots: $(curl -s -o /dev/null -w '%{http_code}' https://beijing.openai2000.cn/robots.txt)"
echo "  beijing 首页 robots: $(curl -s -A "$C" https://beijing.openai2000.cn/ | grep -oE '<meta name=\"robots\"[^>]*>')"

echo
echo "--- 10) 301 重定向 ---"
for id in 21 13 16; do
  printf "  /articles/%-4s " $id
  curl -s -o /dev/null -w "code=%{http_code} -> %{redirect_url}\n" https://openai2000.cn/articles/$id
done

echo
echo "--- 11) AI 爬虫 ---"
for ua in "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" "Mozilla/5.0 (compatible; PerplexityBot/1.0)" "Mozilla/5.0 (iPhone) MicroMessenger/8.0.44"; do
  echo "  $(curl -s -A "$ua" https://openai2000.cn/ | wc -c) 字节  $(echo "$ua" | cut -c1-38)"
done

echo
echo "--- 12) 文章封面图 ---"
curl -s -o /dev/null -w "  article cover code=%{http_code} size=%{size_download}\n" https://openai2000.cn/seo/images/articles/9.jpg
curl -s -o /dev/null -w "  og-cover     code=%{http_code} size=%{size_download}\n" https://openai2000.cn/seo/images/og-cover.png

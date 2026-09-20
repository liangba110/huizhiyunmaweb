#!/bin/bash
echo "=== 301 重定向验证 ==="
for id in 21 13 16 22 30 108; do
  printf "  /articles/%-4s -> " $id
  curl -s -o /dev/null -w "code=%{http_code} loc=%{redirect_url}\n" https://openai2000.cn/articles/$id
done
echo
echo "--- 保留篇应 200 ---"
for id in 9 24 11 32 20 84; do
  printf "  /articles/%-4s code=" $id
  curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0 (compatible; Baiduspider/2.0)" https://openai2000.cn/articles/$id
done
echo
echo "--- 301 链长度检查（不应多跳）---"
curl -s -o /dev/null -w "hops=%{num_redirects} final=%{url_effective} code=%{http_code}\n" -L https://openai2000.cn/articles/21

echo
echo "=== 当前 sitemap 状态 ==="
echo "  sitemap.xml:          $(curl -s https://openai2000.cn/sitemap.xml | grep -c '<loc>')"
echo "  sitemap-articles.xml: $(curl -s https://openai2000.cn/sitemap-articles.xml | grep -c '<loc>')"
echo "  sitemap-cases.xml:    $(curl -s https://openai2000.cn/sitemap-cases.xml | grep -c '<loc>')"
echo "  其中子域 URL:         $(curl -s https://openai2000.cn/sitemap.xml | grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' | wc -l)"

echo
echo "=== 文章列表页体量 ==="
UA="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
echo "  /articles 大小: $(curl -s -A "$UA" https://openai2000.cn/articles | wc -c) 字节"
echo "  文章链接数:     $(curl -s -A "$UA" https://openai2000.cn/articles | grep -oE 'href="https://openai2000.cn/articles/[0-9]+"' | sort -u | wc -l)"

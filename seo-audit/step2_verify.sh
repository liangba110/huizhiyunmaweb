#!/bin/bash
echo "=== 1) 确认 sitemap 无子域 ==="
grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' /data/web/huizhiyunma/frontend/dist/sitemap.xml | sort -u | head
echo "(以上为空 = ✓ 无子域URL)"
echo "主站URL数: $(grep -c '<loc>https://openai2000\.cn' /data/web/huizhiyunma/frontend/dist/sitemap.xml)"

echo
echo "=== 2) 修复 dist 属主 ==="
chown -R www-data:www-data /data/web/huizhiyunma/frontend/dist
echo "done"

echo
echo "=== 3) reload nginx ==="
nginx -t 2>&1 | tail -2
systemctl reload nginx && echo "reload OK"

sleep 2
echo
echo "=== 4) 端到端验证 ==="
UA_BAIDU="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
echo "--- 4.1 sitemap 无子域 ---"
curl -s https://openai2000.cn/sitemap.xml | grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' | wc -l

echo "--- 4.2 城市站 robots 独立 ---"
curl -s https://qingdao.openai2000.cn/robots.txt

echo "--- 4.3 城市站 sitemap 独立 ---"
curl -s -o /dev/null -w "code=%{http_code} type=%{content_type}\n" https://qingdao.openai2000.cn/sitemap.xml
curl -s https://qingdao.openai2000.cn/sitemap.xml | head -12

echo "--- 4.4 AI 爬虫现在能拿到内容 ---"
for ua in "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" "Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)" "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.44"; do
  L=$(curl -s -A "$ua" https://openai2000.cn/ | wc -c)
  echo "  len=$L  $(echo $ua | cut -c1-45)"
done

echo "--- 4.5 文章页图片 ---"
curl -s -o /dev/null -w "文章封面 code=%{http_code} size=%{size_download}\n" -A "$UA_BAIDU" https://openai2000.cn/seo/images/articles/1.jpg
curl -s -o /dev/null -w "og-cover   code=%{http_code} size=%{size_download}\n" https://openai2000.cn/seo/images/og-cover.png

echo "--- 4.6 Article 结构化数据 ---"
curl -s -A "$UA_BAIDU" https://openai2000.cn/articles/1 | grep -oE '"datePublished":"[^"]*"|"dateModified":"[^"]*"|"image":\[[^]]*\]|"author":\{"@type":"[^"]*"' | head -5

echo "--- 4.7 非重点城市 noindex ---"
curl -s -A "Mozilla/5.0 (Windows NT 10.0) Chrome/131" https://tangshan.openai2000.cn/ | grep -oE '<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'

#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
WL="qingdao jinan yantai weifang linyi"

echo "=== 清理非白名单城市残留的 robots/sitemap ==="
removed=0
for d in $D/city/*/; do
  sd=$(basename $d)
  [ "$sd" = "" ] && continue
  keep=0
  for w in $WL; do [ "$sd" = "$w" ] && keep=1; done
  if [ $keep -eq 0 ]; then
    if [ -f "$d/robots.txt" ] || [ -f "$d/sitemap.xml" ]; then
      rm -f "$d/robots.txt" "$d/sitemap.xml"
      removed=$((removed+1))
    fi
  fi
done
echo "清理 $removed 个城市"
echo "剩余 sitemap 数: $(find $D/city -maxdepth 2 -name sitemap.xml | wc -l)"
echo "剩余 robots 数: $(find $D/city -maxdepth 2 -name robots.txt | wc -l)"

echo
echo "=== 清理 .html 级旧城市页（city/xxx.html 单页版） ==="
mkdir -p /data/disk/backups/city_single_html_$(date +%Y%m%d)
mv $D/city/*.html /data/disk/backups/city_single_html_$(date +%Y%m%d)/ 2>/dev/null
echo "已归档 $(ls /data/disk/backups/city_single_html_$(date +%Y%m%d)/ | wc -l) 个单页文件"

echo
echo "=== 线上端到端验证 ==="
UA_B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
UA_C="Mozilla/5.0 (Windows NT 10.0) Chrome/131"

echo "--- 1. 白名单城市(qingdao) 浏览器首页 ---"
curl -s -A "$UA_C" https://qingdao.openai2000.cn/ | grep -oE '<title>[^<]*</title>|<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'

echo "--- 2. 非白名单城市(beijing) 浏览器首页 ---"
curl -s -A "$UA_C" https://beijing.openai2000.cn/ | grep -oE '<title>[^<]*</title>|<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'

echo "--- 3. 非白名单城市(beijing) 百度UA ---"
curl -s -A "$UA_B" https://beijing.openai2000.cn/ | grep -oE '<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'

echo "--- 4. 白名单城市 robots/sitemap ---"
curl -s https://qingdao.openai2000.cn/robots.txt
curl -s -o /dev/null -w "sitemap: code=%{http_code}\n" https://qingdao.openai2000.cn/sitemap.xml

echo "--- 5. 非白名单城市 robots (应404) ---"
curl -s -o /dev/null -w "beijing robots: code=%{http_code}\n" https://beijing.openai2000.cn/robots.txt

echo "--- 6. 主站 sitemap 子域数(应0) ---"
curl -s https://openai2000.cn/sitemap.xml | grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' | wc -l

echo "--- 7. AI 爬虫 ---"
for ua in "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" "Mozilla/5.0 (compatible; PerplexityBot/1.0)" "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) MicroMessenger/8.0.44"; do
  echo "  len=$(curl -s -A "$ua" https://openai2000.cn/ | wc -c)  $(echo "$ua" | cut -c1-42)"
done

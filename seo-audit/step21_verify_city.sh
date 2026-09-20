#!/bin/bash
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"

echo "########## 城市站群 P3 线上验证 ##########"
echo
echo "--- 1) 白名单 2 城：robots / sitemap / 索引 ---"
for c in qingdao jinan; do
  echo "  [$c]"
  echo "    robots.txt : $(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/robots.txt)"
  echo "    sitemap.xml: $(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/sitemap.xml) ($(curl -s https://$c.openai2000.cn/sitemap.xml | grep -c '<loc>') 条)"
  echo "    首页 robots: $(curl -s -A "$C" https://$c.openai2000.cn/ | grep -oE '<meta name="robots"[^>]*>')"
  echo "    首页字数   : $(curl -s -A "$B" https://$c.openai2000.cn/ | python3 -c "
import sys,re
h=sys.stdin.read(); h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
print(len(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()))
")"
  echo "    FAQPage    : $(curl -s -A "$B" https://$c.openai2000.cn/ | grep -c 'FAQPage')"
done

echo
echo "--- 2) 已移出白名单 3 城：应全部 noindex 且无 robots/sitemap ---"
for c in yantai weifang linyi; do
  echo "  [$c]"
  echo "    robots.txt : $(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/robots.txt) (应404)"
  echo "    sitemap    : $(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/sitemap.xml) (应404)"
  echo "    首页 robots: $(curl -s -A "$C" https://$c.openai2000.cn/ | grep -oE '<meta name="robots"[^>]*>')"
done

echo
echo "--- 3) 其他城市抽检（应为 noindex 且 robots 404）---"
for c in beijing shanghai shenzhen chengdu; do
  printf "  %-10s robots=%s  sitemap=%s  meta=%s\n" "$c" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/robots.txt)" \
    "$(curl -s -o /dev/null -w '%{http_code}' https://$c.openai2000.cn/sitemap.xml)" \
    "$(curl -s -A "$C" https://$c.openai2000.cn/ | grep -oE 'content="noindex[^"]*"' | head -1)"
done

echo
echo "--- 4) 非白名单城市所有子页面也要 noindex ---"
for u in services cases about templates packages articles contact; do
  printf "  yantai/%-11s %s\n" "$u" "$(curl -s -A "$C" https://yantai.openai2000.cn/$u | grep -oE 'content="noindex[^"]*"' | head -1)"
done

echo
echo "--- 5) 主站不受影响 ---"
echo "  主站 sitemap: $(curl -s https://openai2000.cn/sitemap.xml | grep -c '<loc>') 条，含子域 $(curl -s https://openai2000.cn/sitemap.xml | grep -oE '<loc>https://[a-z0-9-]+\.openai2000\.cn' | wc -l) 条"
echo "  主站首页 robots: $(curl -s -A "$C" https://openai2000.cn/ | grep -oE '<meta name="robots"[^>]*>' | head -1) (无=默认index)"

echo
echo "--- 6) 青岛/济南 深度内容线上确认 ---"
for c in qingdao jinan; do
  echo "  [$c]"
  curl -s -A "$B" https://$c.openai2000.cn/ | python3 -c "
import sys,re
h=sys.stdin.read()
h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
i=t.find('本地开发服务说明')
print('    深度段落存在:', 'OK' if i>=0 else '缺失')
print('    片段:', t[i:i+120] if i>=0 else '-')
print('    含本地独有词:', ' '.join([w for w in ['胶州','西海岸','高铁','等保','信创','齐鲁软件园','上合'] if w in t]))
"
done

echo
echo "--- 7) 城市站互链/主机可达性 ---"
for c in qingdao jinan yantai beijing; do
  printf "  %-10s 首页=%s services=%s\n" "$c" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" https://$c.openai2000.cn/)" \
    "$(curl -s -o /dev/null -w '%{http_code}' -A "$B" https://$c.openai2000.cn/services)"
done

#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist/city/yantai
C="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"
B="Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

echo "=== 磁盘上的文件 robots meta ==="
for f in cases articles index services about; do
  printf "  %-10s %s 字节  meta=%s\n" "$f.html" "$(wc -c < $D/$f.html 2>/dev/null)" \
    "$(grep -oE '<meta name="robots"[^>]*>' $D/$f.html 2>/dev/null | head -1)"
done

echo
echo "=== 线上响应头 + 前 400 字符 ==="
for u in cases articles; do
  echo "  [$u]"
  curl -s -I -A "$C" "https://yantai.openai2000.cn/$u" | head -3 | sed 's/^/    /'
  curl -s -A "$C" "https://yantai.openai2000.cn/$u" | head -c 300 | sed 's/^/    /'
  echo
done

echo
echo "=== 用百度 UA 再试 ==="
for u in cases articles; do
  printf "  %-10s %s\n" "$u" "$(curl -s -A "$B" "https://yantai.openai2000.cn/$u" | grep -oE '<meta name="robots"[^>]*>' | head -1)"
done

echo
echo "=== nginx 城市子域 cases/articles 路由 ==="
grep -n "cases\|articles" /etc/nginx/sites-enabled/huizhiyunma | sed -n '1,40p'

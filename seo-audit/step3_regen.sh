#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
cd /data/web/huizhiyunma/backend/seo

node --check generate.js || exit 1
echo "=== 运行 generate.js ==="
sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node generate.js 2>&1 | tail -12

chown -R www-data:www-data /data/web/huizhiyunma/frontend/dist
nginx -t 2>&1 | tail -1
systemctl reload nginx && echo "reload OK"
sleep 2

D=/data/web/huizhiyunma/frontend/dist
echo
echo "=== 验证 ==="
echo "--- 白名单城市 sitemap 数 ---"
find $D/city -maxdepth 2 -name sitemap.xml | wc -l
echo "--- 白名单城市 robots 数 ---"
find $D/city -maxdepth 2 -name robots.txt | wc -l
echo "--- 白名单城市 index.html robots ---"
for c in qingdao jinan yantai weifang linyi; do
  printf "  %-10s " $c; grep -oE '<meta name="robots"[^>]*>' $D/city/$c/index.html | head -1
done
echo "--- 非白名单城市 index.html robots ---"
for c in beijing tangshan anshan; do
  printf "  %-10s " $c; grep -oE '<meta name="robots"[^>]*>' $D/city/$c/index.html | head -1
done
echo "--- 非白名单城市 spa_index robots ---"
for c in beijing tangshan; do
  printf "  %-10s " $c; grep -oE '<meta name="robots"[^>]*>' $D/city/$c/spa_index.html | head -1
done
echo "--- 白名单城市 spa_index robots ---"
printf "  qingdao    "; grep -oE '<meta name="robots"[^>]*>' $D/city/qingdao/spa_index.html | head -1

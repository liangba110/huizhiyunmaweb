#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
cd /data/web/huizhiyunma/backend/seo

echo "=== 语法检查 ==="
node --check generate.js && echo "语法 OK" || { echo "语法错误"; exit 1; }

echo
echo "=== 运行 generate.js（以 www-data 身份，与 cron 一致）==="
sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node generate.js 2>&1 | tail -40

echo
echo "=== 产物检查 ==="
D=/data/web/huizhiyunma/frontend/dist
echo "--- sitemap 是否还有子域 ---"
grep -c 'openai2000.cn' $D/sitemap.xml
grep -o '<loc>https://[a-z]*\.openai2000\.cn' $D/sitemap.xml | head -3 || echo "✓ 无子域URL"
echo "--- sitemap 条数 ---"
grep -c '<loc>' $D/sitemap.xml
echo "--- 城市站 robots/sitemap ---"
ls -la $D/city/qingdao/robots.txt $D/city/qingdao/sitemap.xml 2>&1
cat $D/city/qingdao/robots.txt 2>/dev/null
echo "--- 城市站 robots 总数 ---"
find $D/city -maxdepth 2 -name robots.txt | wc -l
echo "--- 文章封面图 ---"
ls $D/seo/images/articles/ 2>/dev/null | wc -l
echo "--- og-cover 尺寸 ---"
identify $D/seo/images/og-cover.png 2>/dev/null || ls -la $D/seo/images/og-cover.png
echo "--- 非重点城市 spa_index robots ---"
grep -o '<meta name="robots"[^>]*>' $D/city/tangshan/spa_index.html 2>/dev/null
echo "--- 重点城市 spa_index robots ---"
grep -o '<meta name="robots"[^>]*>' $D/city/qingdao/spa_index.html 2>/dev/null
echo "--- 文章页 og:image + Article schema ---"
grep -o 'og:image" content="[^"]*"' $D/seo/articles/1.html | head -2
grep -o '"datePublished":"[^"]*"' $D/seo/articles/1.html
grep -o '"image":\[[^]]*\]' $D/seo/articles/1.html | head -1
grep -o '"author":{"@type":"[^"]*"' $D/seo/articles/1.html | head -1

#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
GEN=/data/web/huizhiyunma/backend/seo/generate.js
node --check $GEN || exit 1
cd /data/web/huizhiyunma/backend/seo
sudo -n -u www-data env PATH="$PATH" NODE_PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules node generate.js 2>&1 | tail -14
chown -R www-data:www-data /data/web/huizhiyunma/frontend/dist

echo
echo "=== 分页页生成情况 ==="
ls /data/web/huizhiyunma/frontend/dist/articles/page/ 2>/dev/null | head
echo "分页数: $(ls /data/web/huizhiyunma/frontend/dist/articles/page/ 2>/dev/null | wc -l)"

echo
echo "=== sitemap 分页 URL ==="
grep -c 'articles/page/' /data/web/huizhiyunma/frontend/dist/sitemap.xml
echo "sitemap 总数: $(grep -c '<loc>' /data/web/huizhiyunma/frontend/dist/sitemap.xml)"

echo
echo "=== schema 检查 ==="
D=/data/web/huizhiyunma/frontend/dist
echo "首页 FAQPage: $(grep -c 'FAQPage' $D/index.seo.html)"
echo "服务页 FAQPage: $(grep -c 'FAQPage' $D/services.html)"
echo "行业页 FAQPage(餐饮): $(grep -c 'FAQPage' $D/solutions/catering.html)"
echo "行业页面包屑(餐饮): $(grep -c 'BreadcrumbList' $D/solutions/catering.html)"
echo "文章页面包屑: $(grep -c 'BreadcrumbList' $D/seo/articles/9.html)"
echo "案例页面包屑: $(grep -c 'BreadcrumbList' $D/seo/cases/1.html)"

echo
echo "=== 分页页面包屑 + 大小 ==="
for f in $D/articles/page/*.html; do
  printf "  %-12s %6s 字节  Breadcrumb=%s\n" "$(basename $f)" "$(wc -c < $f)" "$(grep -c BreadcrumbList $f)"
done

echo
echo "=== 文章列表页大小对比 ==="
echo "  /articles      : $(wc -c < $D/articles.html) 字节"
echo "  第2页           : $(wc -c < $D/articles/page/2.html) 字节"

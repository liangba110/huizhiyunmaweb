#!/bin/bash
set -e
TS=$(date +%Y%m%d_%H%M%S)
BK=/data/disk/backups/huizhiyunma_seo_$TS
mkdir -p $BK
echo "备份目录: $BK"

# 关键文件备份
cp /data/web/huizhiyunma/backend/seo/generate.js $BK/generate.js
cp /data/web/huizhiyunma/backend/seo/cities.json $BK/cities.json
cp /etc/nginx/sites-enabled/huizhiyunma $BK/nginx_huizhiyunma.conf
cp /data/web/huizhiyunma/frontend/dist/sitemap.xml $BK/ 2>/dev/null || true
cp /data/web/huizhiyunma/frontend/dist/robots.txt $BK/ 2>/dev/null || true
cp -r /data/web/huizhiyunma/frontend/dist/seo $BK/dist_seo 2>/dev/null || true

echo "--- 备份内容 ---"
ls -la $BK
echo $BK > /tmp/seo_backup_dir.txt
echo "备份完成"

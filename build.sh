#!/bin/bash
# ============================================================
# 汇智云码 - 统一构建脚本（防 dist 权限问题）
# 所有写 dist 的操作统一以 www-data 身份执行：
#   1. vite build（前端构建）
#   2. generate.js（SEO 静态页 + sitemap 重建）
# 这样 dist 里所有文件属主都是 www-data，vite build 清空时不会 EACCES
# 用法：sudo bash /data/web/huizhiyunma/build.sh
# ============================================================
set -e
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"

echo "=== [1/2] 前端构建（vite build，www-data）==="
sudo -n -u www-data env PATH="$PATH" bash -c 'cd /data/web/huizhiyunma/frontend && npx vite build 2>&1 | tail -8'

echo "=== [2/2] SEO 静态页 + sitemap 重建（generate.js，www-data）==="
sudo -n -u www-data env PATH="$PATH" bash -c 'cd /data/web/huizhiyunma/backend && node seo/generate.js 2>&1 | tail -8'

echo "=== 校验 dist 属主（应全为 www-data）==="
NON_WW=$(find /data/web/huizhiyunma/frontend/dist -not -user www-data | wc -l)
if [ "$NON_WW" -eq 0 ]; then
  echo "✅ dist 全部属主 www-data，构建完成"
else
  echo "⚠️ 有 $NON_WW 个文件属主异常，请检查"
  find /data/web/huizhiyunma/frontend/dist -not -user www-data | head -5
fi

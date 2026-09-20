#!/bin/bash
# 前端安全构建脚本（防止OOM）
# 用法: bash /data/web/huizhiyunma/scripts/safe_build.sh

set -e

echo "=== 前端安全构建 $(date '+%Y-%m-%d %H:%M:%S') ==="

# 1. 检查可用内存（至少需要800MB）
AVAIL_MB=$(free -m | awk 'NR==2{print $7}')
if [ "$AVAIL_MB" -lt 800 ]; then
    echo "❌ 可用内存不足 (${AVAIL_MB}MB < 800MB)，跳过构建"
    exit 1
fi
echo "✅ 可用内存: ${AVAIL_MB}MB"

# 2. 清理残留chrome进程
CHROME_COUNT=$(pgrep -f 'puppeteer_dev_profile' 2>/dev/null | wc -l)
if [ "$CHROME_COUNT" -gt 0 ]; then
    echo "⚠️ 发现 ${CHROME_COUNT} 个残留chrome进程，正在清理..."
    pkill -9 -f 'puppeteer_dev_profile' 2>/dev/null || true
    sleep 3
fi

# 3. 设置Node内存限制
export NODE_OPTIONS="--max-old-space-size=512"

# 4. 执行构建
cd /data/web/huizhiyunma/frontend
echo "开始构建..."
npx vite build

# 5. 重新生成静态SEO页面
echo "重新生成静态SEO页面..."
cd /data/web/huizhiyunma/backend/seo
node generate.js

# 6. 验证
echo ""
echo "=== 构建完成 ==="
echo "产物大小: $(du -sh /data/web/huizhiyunma/frontend/dist/assets/ | awk '{print $1}')"
echo "sitemap URL: $(grep -c '<loc>' /data/web/huizhiyunma/frontend/dist/sitemap.xml 2>/dev/null || echo 'N/A')"
echo "完成时间: $(date '+%Y-%m-%d %H:%M:%S')"

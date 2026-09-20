#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== staticPages 数组起始 ==="
grep -n "staticPages\s*=\|const staticPages\|var staticPages" $GEN
echo
echo "=== dynamicPages 用法 ==="
grep -n "dynamicPages" $GEN
echo
echo "=== sitemap URL 收集 urls.push ==="
grep -n "urls.push" $GEN
echo
echo "=== articles.html 定义行 ==="
grep -n "articles.html" $GEN
echo
echo "=== 静态页写入循环 ==="
grep -n "staticPages" $GEN

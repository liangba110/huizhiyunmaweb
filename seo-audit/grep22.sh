#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== PRIORITY_CITIES 定义 (915-1018) ==="
awk 'NR>=915 && NR<=1018 {printf "%d|%s\n", NR, $0}' $G

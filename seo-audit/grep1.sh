#!/bin/bash
echo "=== PRIORITY_CITIES 引用点 ==="
grep -n 'PRIORITY_CITIES\[' /data/web/huizhiyunma/backend/seo/generate.js
echo
echo "=== robots: 相关行 ==="
grep -n 'robots:' /data/web/huizhiyunma/backend/seo/generate.js
echo
echo "=== isIndexableCity 使用点 ==="
grep -n 'isIndexableCity' /data/web/huizhiyunma/backend/seo/generate.js

#!/bin/bash
G=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== cityBody 全文 (1019-1110) ==="
awk 'NR>=1019 && NR<=1115 {printf "%d|%s\n", NR, $0}' $G

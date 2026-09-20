#!/bin/bash
# 只读勘察
echo "=== nginx conf 文件列表 ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null
ls -la /etc/nginx/conf.d/ 2>/dev/null | head -20
echo
echo "=== 含 openai2000 的 nginx 配置 ==="
grep -rl 'openai2000' /etc/nginx/ 2>/dev/null
echo
echo "=== conf 行数 ==="
wc -l /etc/nginx/sites-enabled/* 2>/dev/null
echo
echo "=== generate.js 行数 ==="
wc -l /data/web/huizhiyunma/backend/seo/generate.js /data/web/huizhiyunma/backend/seo/generate_article.js
echo
echo "=== cities.json 结构 ==="
python3 -c "
import json
d=json.load(open('/data/web/huizhiyunma/backend/seo/cities.json'))
print('type', type(d).__name__, 'len', len(d))
if isinstance(d, dict):
    ks=list(d.keys()); print('keys[:5]', ks[:5])
    print('sample:', json.dumps(d[ks[0]], ensure_ascii=False)[:500])
elif isinstance(d, list):
    print('sample:', json.dumps(d[0], ensure_ascii=False)[:500])
"
echo
echo "=== crontab (root) ==="
sudo -n crontab -l 2>/dev/null | head -30
echo
echo "=== nginx 是否已启用 city 子域 ==="
grep -rn 'server_name' /etc/nginx/sites-enabled/ 2>/dev/null | head -30

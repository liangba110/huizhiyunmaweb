#!/bin/bash
echo "=== 推送主站全站 + 青岛/济南 到 IndexNow ==="
bash /data/web/huizhiyunma/backend/seo/push_indexnow.sh all 2>&1 | tail -4
echo
echo "--- 把青岛/济南 城市站也推一遍 ---"
KEY=$(cat /data/web/huizhiyunma/backend/seo/indexnow_key.txt)
python3 - "$KEY" <<'PYEOF'
import json, sys, urllib.request, urllib.error
key = sys.argv[1]
urls = []
for sd in ['qingdao', 'jinan']:
    b = f'https://{sd}.openai2000.cn'
    for p in ['/', '/services', '/cases', '/about', '/templates', '/packages', '/articles', '/contact']:
        urls.append(b + p if p != '/' else b + '/')
import subprocess
# 只推白名单城市的首页与核心页（sitemap 里已声明，这里主动加速）
payload = json.dumps({
    'host': 'qingdao.openai2000.cn', 'key': key,
    'keyLocation': f'https://openai2000.cn/{key}.txt',
    'urlList': urls
}).encode('utf-8')
for host in ['qingdao.openai2000.cn', 'jinan.openai2000.cn']:
    u = [x for x in urls if host in x]
    if not u: continue
    p = json.dumps({'host': host, 'key': key, 'keyLocation': f'https://openai2000.cn/{key}.txt', 'urlList': u}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=p,
        headers={'Content-Type': 'application/json; charset=utf-8'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(f'  ✅ {host}: {r.status} ({len(u)} 条)')
    except urllib.error.HTTPError as e:
        print(f'  ❌ {host}: HTTP {e.code} {e.read().decode(errors="ignore")[:150]}')
    except Exception as e:
        print(f'  ❌ {host}: {e}')
PYEOF

echo
echo "=== 日志尾部 ==="
tail -6 /data/web/huizhiyunma/backend/seo/push_indexnow.log

echo
echo "=== 白名单城市 sitemap 内容 ==="
curl -s https://qingdao.openai2000.cn/sitemap.xml

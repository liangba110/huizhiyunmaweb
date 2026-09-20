#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
echo "=== dist 顶层 ==="
ls $D/ | head -30
echo
echo "=== dist/seo 顶层 ==="
ls $D/seo/ | head -30
echo
echo "=== 静态页位置 ==="
ls -la $D/*.html $D/seo/*.html 2>/dev/null | head -20
echo
echo "=== solutions 位置 ==="
find $D -maxdepth 3 -name 'catering.html'
echo
echo "=== 可见文字量（各栏目页）==="
python3 - <<'PY'
import re, glob, os
cands = glob.glob('/data/web/huizhiyunma/frontend/dist/seo/*.html') + glob.glob('/data/web/huizhiyunma/frontend/dist/*.html')
for f in sorted(set(cands)):
    h = open(f, encoding='utf-8').read()
    b = re.sub(r'<script.*?</script>', '', h, flags=re.S)
    b = re.sub(r'<style.*?</style>', '', b, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', b)
    t = re.sub(r'\s+', ' ', t).strip()
    print(f'  {os.path.basename(f):24s} 文字 {len(t):6d} 字  文件 {len(h):7d} 字节')
PY

#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
GEN=/data/web/huizhiyunma/backend/seo/generate.js
node --check $GEN && echo "SYNTAX_OK" || exit 1
cd /data/web/huizhiyunma/backend/seo
sudo -n -u www-data env PATH="$PATH" NODE_PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules node generate.js 2>&1 | tail -8
chown -R www-data:www-data /data/web/huizhiyunma/frontend/dist
echo
echo "=== 扩写后可见文字量 ==="
python3 - <<'PY'
import re, glob, os
D='/data/web/huizhiyunma/frontend/dist'
for f in sorted(glob.glob(D+'/*.html')):
    h=open(f,encoding='utf-8').read()
    b=re.sub(r'<script.*?</script>','',h,flags=re.S)
    b=re.sub(r'<style.*?</style>','',b,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b)).strip()
    print(f'  {os.path.basename(f):22s} {len(t):6d} 字')
print('--- solutions ---')
for f in sorted(glob.glob(D+'/solutions/*.html')):
    h=open(f,encoding='utf-8').read()
    b=re.sub(r'<script.*?</script>','',h,flags=re.S)
    b=re.sub(r'<style.*?</style>','',b,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b)).strip()
    print(f'  {os.path.basename(f):22s} {len(t):6d} 字')
PY

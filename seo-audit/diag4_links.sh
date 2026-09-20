#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
echo "=== 全站 HTML 内链健康度审计 ==="
python3 - <<'PY'
import re, glob, os, json, subprocess
D='/data/web/huizhiyunma/frontend/dist'
links={}   # url -> [sources]
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    rel=os.path.relpath(f,D)
    for m in re.finditer(r'href="https://openai2000\.cn(/[^"#?]*)"', h):
        u=m.group(1)
        links.setdefault(u,set()).add(rel)
print(f'  唯一内链目标: {len(links)}')
json.dump({k:sorted(v) for k,v in links.items()}, open('/tmp/links.json','w'))
PY

echo
echo "=== 逐个检测状态码 ==="
python3 - <<'PY' > /tmp/linkres.txt
import json, subprocess, re, concurrent.futures
links=json.load(open('/tmp/links.json'))
def chk(u):
    r=subprocess.run(['curl','-s','-o','/dev/null','-w','%{http_code} %{redirect_url}',
                      '-A','Mozilla/5.0 Baiduspider/2.0','https://openai2000.cn'+u],
                     capture_output=True,text=True,timeout=25)
    return u, r.stdout.strip()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for u,res in ex.map(chk, links.keys()):
        print(f'{res}\t{u}')
PY
echo "  检测完成，总 $(wc -l < /tmp/linkres.txt) 条"

echo
echo "=== 结果分类 ==="
echo "  200 (正常): $(grep -c '^200' /tmp/linkres.txt)"
echo "  301 (重定向): $(grep -c '^301' /tmp/linkres.txt)"
echo "  404: $(grep -c '^404' /tmp/linkres.txt)"
echo "  其他: $(grep -vcE '^(200|301|404)' /tmp/linkres.txt)"
echo
echo "  非 200 明细（URL + 来源页）:"
python3 - <<'PY'
import json,re
links=json.load(open('/tmp/links.json'))
for line in open('/tmp/linkres.txt'):
    parts=line.rstrip('\n').split('\t')
    if len(parts)<2: continue
    code=parts[0].split()[0]
    u=parts[1]
    if code!='200':
        src=links.get(u,[])
        print(f'    {code:4s} {u:45s} ← 来源 {len(src)} 页: {src[:2]}')
PY

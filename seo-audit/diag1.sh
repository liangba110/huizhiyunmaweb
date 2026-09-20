#!/bin/bash
D=/data/web/huizhiyunma/frontend/dist
echo "########## 全站诊断 ##########"
echo
echo "=== A) title / description 长度 ==="
python3 - <<'PY'
import re, glob, os
D='/data/web/huizhiyunma/frontend/dist'
rows=[]
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/articles/*.html')+glob.glob(D+'/seo/cases/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    t=re.search(r'<title>(.*?)</title>',h,re.S)
    d=re.search(r'<meta name="description" content="(.*?)"',h,re.S)
    t=t.group(1).strip() if t else ''
    d=d.group(1).strip() if d else ''
    rows.append((os.path.relpath(f,D), len(t), len(d), t[:50], d[:40]))
bad_t=[r for r in rows if r[1]>60 or r[1]<10]
bad_d=[r for r in rows if r[2]>160 or r[2]<60]
print(f'  页面总数: {len(rows)}')
print(f'  title 超60字符: {len(bad_t)}')
for r in bad_t[:8]: print(f'    {r[1]:3d}  {r[0]}')
print(f'  description 超160或过短: {len(bad_d)}')
for r in bad_d[:8]: print(f'    {r[2]:3d}  {r[0]}')
import statistics
print(f'  title 均长 {statistics.mean([r[1] for r in rows]):.0f} / desc 均长 {statistics.mean([r[2] for r in rows]):.0f}')
PY

echo
echo "=== B) H1 数量 / img alt 缺失 ==="
python3 - <<'PY'
import re, glob, os
D='/data/web/huizhiyunma/frontend/dist'
noH1=[];multiH1=[];noalt=[];timg=0
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    h2=re.sub(r'<script.*?</script>','',h,flags=re.S)
    n=len(re.findall(r'<h1',h2))
    rel=os.path.relpath(f,D)
    if n==0: noH1.append(rel)
    elif n>1: multiH1.append((rel,n))
    for m in re.finditer(r'<img\b[^>]*>',h2):
        timg+=1
        if 'alt=' not in m.group(0): noalt.append(rel)
print(f'  无 H1: {len(noH1)}  {noH1[:6]}')
print(f'  多 H1: {len(multiH1)}  {multiH1[:6]}')
print(f'  img 总数 {timg}，缺 alt {len(noalt)} 处 / 涉及 {len(set(noalt))} 页')
PY

echo
echo "=== C) 可见面包屑（schema 有了，页面上有没有）==="
for u in /services /solutions/catering /articles/9 /cases/1; do
  printf "  %-22s " "$u"
  curl -s -A "Mozilla/5.0 Baiduspider/2.0" "https://openai2000.cn$u" | grep -oE 'breadcrumb|面包屑|aria-label="[^"]*"' | sort -u | tr '\n' ' ' | head -c 90
  echo
done

echo
echo "=== D) og:image 全站可达性 ==="
python3 - <<'PY'
import re, glob, os, subprocess, json
D='/data/web/huizhiyunma/frontend/dist'
urls=set()
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    m=re.search(r'<meta property="og:image" content="(.*?)"',h)
    if m: urls.add(m.group(1))
print(f'  唯一 og:image: {len(urls)}')
script='\n'.join(f'printf "  %s %s\\n" "$(curl -s -o /dev/null -w "%{{http_code}}:%{{size_download}}" \'{u}\')" "{u[:60]}"' for u in sorted(urls))
open('/tmp/chkimg.sh','w').write(script)
PY
bash /tmp/chkimg.sh 2>/dev/null | sort | uniq -c | sort -rn | head -12

echo
echo "=== E) 文章页正文体量分布 ==="
python3 - <<'PY'
import re, glob, os, statistics
D='/data/web/huizhiyunma/frontend/dist/seo/articles'
ws=[]
for f in glob.glob(D+'/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
    ws.append((len(t), os.path.basename(f)))
ws.sort()
print(f'  文章 {len(ws)} 篇，均 {statistics.mean([w[0] for w in ws]):.0f} 字')
print(f'  <800 字: {len([w for w in ws if w[0]<800])}')
for w in ws[:8]: print(f'    {w[0]:5d}  {w[1]}')
print(f'  最多: {ws[-3:]}')
PY

echo
echo "=== F) 案例页正文体量 ==="
python3 - <<'PY'
import re, glob, os, statistics
D='/data/web/huizhiyunma/frontend/dist/seo/cases'
ws=[]
for f in glob.glob(D+'/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    h=re.sub(r'<script.*?</script>','',h,flags=re.S); h=re.sub(r'<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h)).strip()
    ws.append((len(t), os.path.basename(f)))
ws.sort()
print(f'  案例 {len(ws)} 篇，均 {statistics.mean([w[0] for w in ws]):.0f} 字')
print(f'  <700 字: {len([w for w in ws if w[0]<700])}')
for w in ws[:6]: print(f'    {w[0]:5d}  {w[1]}')
PY

echo
echo "=== G) title 重复检测 ==="
python3 - <<'PY'
import re, glob, os, collections
D='/data/web/huizhiyunma/frontend/dist'
m=collections.defaultdict(list)
for f in glob.glob(D+'/*.html')+glob.glob(D+'/seo/*/*.html')+glob.glob(D+'/solutions/*.html'):
    h=open(f,encoding='utf-8',errors='ignore').read()
    t=re.search(r'<title>(.*?)</title>',h,re.S)
    if t: m[t.group(1).strip()].append(os.path.relpath(f,D))
dup={k:v for k,v in m.items() if len(v)>1}
print(f'  重复 title 组数: {len(dup)}')
for k,v in list(dup.items())[:6]: print(f'    "{k[:45]}" x{len(v)}: {v[:3]}')
PY

echo
echo "=== H) 页面资源体积 ==="
echo "  index.html       : $(wc -c < $D/index.html) 字节"
echo "  主 JS bundle     : $(ls -la $D/assets/index-*.js 2>/dev/null | awk '{print $5}') 字节"
echo "  CSS              : $(ls -la $D/assets/index-*.css 2>/dev/null | awk '{print $5}') 字节"
echo "  articles.html    : $(wc -c < $D/articles.html) 字节"
echo "  services.html    : $(wc -c < $D/services.html) 字节"
echo "  images 目录      : $(du -sh $D/seo/images 2>/dev/null | cut -f1)"
echo "  dist 总大小      : $(du -sh $D | cut -f1)"

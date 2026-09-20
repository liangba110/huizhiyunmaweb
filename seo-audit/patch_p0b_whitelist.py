#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P0-2 补丁：
1) 引入可索引城市白名单 city-whitelist.json（默认仅山东5核心城市），
   其余城市站一律 noindex —— 直接对应「方案A：保留3-5核心城市」，可一个文件调整
2) 修 nginx：城市子域首页给浏览器返回城市版 spa_index.html，
   而非 try_files 命中根目录 index.html（导致 299 子域都吐主站页面）
"""
import re, shutil, subprocess, datetime, json, os

TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
GEN = '/data/web/huizhiyunma/backend/seo/generate.js'

# ---------- A) 生成白名单文件 ----------
WL = '/data/web/huizhiyunma/backend/seo/city-whitelist.json'
default_wl = ["qingdao", "jinan", "yantai", "weifang", "linyi"]
if not os.path.exists(WL):
    open(WL, 'w', encoding='utf-8').write(json.dumps(default_wl, ensure_ascii=False, indent=2))
    print(f'  ✓ 生成白名单 {WL}: {default_wl}')
else:
    print(f'  · 白名单已存在，保留: {open(WL,encoding="utf-8").read()}')

# ---------- B) 补丁 generate.js ----------
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_whitelist_{TS}')
changes = []

def rep(old, new, tag, cnt=1):
    global src
    if old not in src:
        print(f'  ✗ [{tag}] 锚点未找到'); return False
    src = src.replace(old, new, cnt)
    print(f'  ✓ [{tag}]'); changes.append(tag); return True

# B1) 白名单机制
old = "// ---------- 主流程 ----------\n// ---------- City SEO Pages ----------"
new = """// ---------- 可索引城市白名单 ----------
// 【SEO 修复】城市站群止险：只有白名单内城市允许搜索引擎索引，
// 其余城市站（含其他 15 个重点城市）一律 noindex 兜底，避免批量近似内容被判站群。
// 调整方式：编辑同目录 city-whitelist.json 后重跑 node generate.js，无需改代码。
var CITY_INDEX_WHITELIST = (function () {
  try {
    var p = path.join(__dirname, 'city-whitelist.json');
    if (fs.existsSync(p)) {
      var arr = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch (e) { console.error('  ⚠️ 读取 city-whitelist.json 失败，使用默认白名单', e.message); }
  return ['qingdao', 'jinan', 'yantai', 'weifang', 'linyi'];
})();
function isIndexableCity(sd) { return CITY_INDEX_WHITELIST.indexOf(sd) >= 0; }

// ---------- 主流程 ----------
// ---------- City SEO Pages ----------"""
rep(old, new, '白名单机制')

# B2) 单页城市站索引门（第一处：cityBody 单文件）
rep("          robots: PRIORITY_CITIES[city.subdomain] ? 'index,follow' : 'noindex,follow',",
    "          robots: isIndexableCity(city.subdomain) ? 'index,follow' : 'noindex,follow',",
    '索引门-单页城市站')

# B3) cityPage 默认 robots
rep('  var robots = opts.robots || (PRIORITY_CITIES[subdomain] ? "index,follow" : "noindex,follow");',
    '  var robots = opts.robots || (isIndexableCity(subdomain) ? "index,follow" : "noindex,follow");',
    '索引门-cityPage默认')

# B4) 多页城市站 robots
rep("          robots: PRIORITY_CITIES[city.subdomain] ? 'index,follow' : 'noindex,follow',",
    "          robots: isIndexableCity(city.subdomain) ? 'index,follow' : 'noindex,follow',",
    '索引门-多页城市站', 0) or None

# B5) SPA 首页索引门（浏览器版）
rep("""  var isPriority = (typeof PRIORITY_CITIES !== 'undefined') && PRIORITY_CITIES[subdomain];
  if (!isPriority) {""",
    """  var isPriority = (typeof isIndexableCity === 'function') ? isIndexableCity(subdomain)
                   : ((typeof PRIORITY_CITIES !== 'undefined') && !!PRIORITY_CITIES[subdomain]);
  if (!isPriority) {""",
    '索引门-SPA页')

# B6) 城市站 robots/sitemap 只给白名单城市生成（避免给 noindex 城市送 sitemap）
rep("""          var sd = prov.cities[j].subdomain;
          if (!PRIORITY_CITIES[sd]) continue;
          var d = path.join(DIST, 'city', sd);""",
    """          var sd = prov.cities[j].subdomain;
          if (!isIndexableCity(sd)) continue;
          var d = path.join(DIST, 'city', sd);""",
    '索引门-城市sitemap')

open(GEN, 'w', encoding='utf-8').write(src)
print(f'  generate.js 共 {len(changes)} 处修改')

# ---------- C) 修 nginx 城市站首页 ----------
NG = '/etc/nginx/sites-enabled/huizhiyunma'
ng = open(NG, encoding='utf-8').read()
shutil.copy(NG, f'{NG}.bak_cityhome_{TS}')

old_city = """    # All routes
    location / {
        if ($is_bot = "1") {
            rewrite ^/$ /city/$subdomain/index.html break;
            rewrite ^/services/?$ /city/$subdomain/services.html break;"""
new_city = """    # 【SEO 修复】首页单独处理：浏览器拿城市版 spa_index.html
    # 原 try_files 中 $uri/ 会命中 dist 根目录并吐出主站 index.html，
    # 导致 299 个城市子域首页对浏览器全部输出同一份主站页面
    location = / {
        if ($is_bot = "1") {
            rewrite ^ /city/$subdomain/index.html break;
        }
        rewrite ^ /city/$subdomain/spa_index.html break;
    }

    # 内页路由
    location / {
        if ($is_bot = "1") {
            rewrite ^/services/?$ /city/$subdomain/services.html break;"""
if old_city in ng:
    ng = ng.replace(old_city, new_city, 1)
    print('  ✓ nginx 城市站首页路由已修正')
else:
    print('  ✗ nginx 城市站 location 锚点未找到')

open(NG, 'w', encoding='utf-8').write(ng)
shutil.copy(NG, '/etc/nginx/sites-available/huizhiyunma')

r = subprocess.run('nginx -t 2>&1 | tail -2', shell=True, capture_output=True, text=True)
print('nginx -t:', r.stdout.strip())

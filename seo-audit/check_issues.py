# -*- coding: utf-8 -*-
"""③ 会员集中问题：文章重复度 / sitemap 跨域 / 空图片 / tel-email 结构化数据"""
import re, subprocess, json, itertools
from difflib import SequenceMatcher

UA = "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

def fetch(url, ua=UA):
    p = subprocess.run(["curl.exe", "-s", "--max-time", "25", "-A", ua, url], capture_output=True)
    return p.stdout.decode("utf-8", "ignore")

def text_of(html):
    b = re.sub(r"<script[\s\S]*?</script>", " ", html)
    b = re.sub(r"<style[\s\S]*?</style>", " ", b)
    b = re.sub(r"<[^>]+>", " ", b)
    return re.sub(r"\s+", " ", b).strip()

print("=== ① sitemap 跨域检测 ===")
for f in ["sitemap.xml", "sitemap-articles.xml", "sitemap-cases.xml"]:
    s = fetch(f"https://openai2000.cn/{f}")
    locs = re.findall(r"<loc>(.*?)</loc>", s)
    hosts = {}
    for u in locs:
        h = u.split("//")[1].split("/")[0]
        hosts[h] = hosts.get(h, 0) + 1
    print(f"{f}: 共{len(locs)}条 " + ", ".join(f"{k}={v}" for k, v in sorted(hosts.items(), key=lambda x: -x[1])[:6]))

print("\n=== ② 疑似同题文章两两相似度 ===")
pairs = [(21,67),(10,32),(12,13),(48,58),(55,71),(29,75),(9,67),(43,None)]
cand = [(21,67),(10,32),(12,13),(48,58),(55,71),(29,75)]
cache = {}
for a,b in cand:
    for i in (a,b):
        if i not in cache:
            cache[i] = text_of(fetch(f"https://openai2000.cn/articles/{i}"))
    ta, tb = cache[a], cache[b]
    r = SequenceMatcher(None, ta, tb).ratio()*100
    ha = (re.findall(r"<h1[^>]*>(.*?)</h1>", fetch(f"https://openai2000.cn/articles/{a}"), re.S) or [""])[0]
    hb = (re.findall(r"<h1[^>]*>(.*?)</h1>", fetch(f"https://openai2000.cn/articles/{b}"), re.S) or [""])[0]
    print(f"articles/{a} ({len(ta)}) vs articles/{b} ({len(tb)}) 相似={r:.1f}%  文字数差={abs(len(ta)-len(tb))}")
    print(f"   H1-a: {re.sub('<[^>]+>','',ha)[:40]}")
    print(f"   H1-b: {re.sub('<[^>]+>','',hb)[:40]}")

print("\n=== ③ 图片资源有效性（文章页缩略图） ===")
h = fetch("https://openai2000.cn/articles")
imgs = set(re.findall(r'<img[^>]+src="([^"]+)"', h))
print("列表页图片:", imgs if imgs else "无")
for i in [21, 43, 79]:
    c = fetch(f"https://openai2000.cn/articles/{i}")
    im = re.findall(r'<img[^>]+src="([^"]+)"', c)
    print(f"articles/{i} 图片: {im}")
    for u in im:
        full = u if u.startswith("http") else "https://openai2000.cn" + u
        p = subprocess.run(["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code} %{size_download}", "--max-time", "15", "-A", UA, full], capture_output=True)
        print(f"    {full} -> {p.stdout.decode().strip()}")

print("\n=== ④ 首页 空名称索引项 & 关键 meta ===")
home = fetch("https://openai2000.cn/")
print("msvalidate.01:", "有" if "msvalidate" in home else "缺失")
print("google-site-verification:", "有" if "google-site-verification" in home else "缺失")
print("og:image:", re.findall(r'og:image" content="([^"]+)"', home))
print("twitter:card:", "有" if "twitter:card" in home else "缺失")
print("hreflang:", "有" if "hreflang" in home else "缺失")
print("百度统计:", "有" if "hm.baidu.com" in home else "无")
print("bing/其他站长验证 meta:", re.findall(r'<meta name="(?:baidu-site-verification|msvalidate\.01|google-site-verification|sogou_site_verification|360-site-verification|bytedance-verification)"[^>]*>', home))

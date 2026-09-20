# -*- coding: utf-8 -*-
"""① sitemap 全量 URL 状态码校验（死链检测） ② 主站 vs 城市站 内容相似度（重复内容检测）"""
import re, subprocess, json, sys
from difflib import SequenceMatcher

UA = "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

def fetch(url, ua=UA, tries=2):
    for _ in range(tries):
        p = subprocess.run(["curl.exe", "-s", "--max-time", "20", "-A", ua, url], capture_output=True)
        t = p.stdout.decode("utf-8", "ignore")
        if t:
            return t
    return ""

def code(url):
    p = subprocess.run(["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code}", "--max-time", "20",
                        "-A", UA, url], capture_output=True)
    return p.stdout.decode(errors="ignore").strip()

def text_of(html):
    b = re.sub(r"<script[\s\S]*?</script>", " ", html)
    b = re.sub(r"<style[\s\S]*?</style>", " ", b)
    b = re.sub(r"<[^>]+>", " ", b)
    return re.sub(r"\s+", " ", b).strip()

def main():
    sm = fetch("https://openai2000.cn/sitemap.xml") + fetch("https://openai2000.cn/sitemap-articles.xml") + fetch("https://openai2000.cn/sitemap-cases.xml")
    locs = []
    for u in re.findall(r"<loc>(.*?)</loc>", sm):
        if u not in locs: locs.append(u)
    print(f"共 {len(locs)} 个 URL，逐个校验状态码 ...")
    bad = []
    for i, u in enumerate(locs, 1):
        c = code(u)
        if c != "200":
            bad.append((c, u))
            print(f"  [{i}/{len(locs)}] {c} {u}")
    print(f"\n非200 = {len(bad)} 条")
    json.dump(bad, open("broken_links.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\n=== 城市站 vs 主站 同名页 相似度 ===")
    cities = ["beijing", "qingdao", "shanghai", "guangzhou", "shenzhen", "tianjin", "hangzhou", "jinan", "yantai", "weifang", "linyi", "zhengzhou", "wuhan", "changsha", "chengdu", "xian", "nanjing", "suzhou", "ningbo", "chongqing"]
    paths = ["/", "/services", "/cases", "/articles", "/about"]
    rows = []
    for p in paths:
        main_t = text_of(fetch(f"https://openai2000.cn{p}"))
        sims = []
        for c in cities[:5]:
            ct = text_of(fetch(f"https://{c}.openai2000.cn{p}"))
            if main_t and ct:
                sims.append(round(SequenceMatcher(None, main_t, ct).ratio() * 100, 1))
        print(f"{p:12} 主站正文={len(main_t):>6}  与5个城市站相似度% = {sims}")
        rows.append((p, len(main_t), sims))
    json.dump(rows, open("dup_similarity.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

main()

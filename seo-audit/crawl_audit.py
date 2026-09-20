# -*- coding: utf-8 -*-
"""汇智云码官网 SEO 审计：抽样抓取 sitemap 页面，检测标题/描述重复、正文长度、内链、图片、结构化数据"""
import re, subprocess, random, json, sys, os
from collections import Counter, defaultdict

UA = "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"

def fetch(url, ua=UA, tries=3):
    for i in range(tries):
        p = subprocess.run(["curl.exe", "-s", "--max-time", "25",
                            "-A", ua, url], capture_output=True)
        try:
            t = p.stdout.decode("utf-8", "ignore")
        except Exception:
            t = ""
        if len(t) > 500:
            return t
    return t

def uniq(seq):
    seen, out = set(), []
    for s in seq:
        if s not in seen:
            seen.add(s); out.append(s)
    return out

def main():
    sm = fetch("https://openai2000.cn/sitemap.xml")
    sm += fetch("https://openai2000.cn/sitemap-articles.xml")
    sm += fetch("https://openai2000.cn/sitemap-cases.xml")
    locs = uniq(re.findall(r"<loc>(.*?)</loc>", sm))
    arts = [u for u in locs if "/articles/" in u]
    cases = [u for u in locs if "/cases/" in u]
    sols = [u for u in locs if "/solutions/" in u]
    misc = [u for u in locs if u not in arts + cases + sols]
    random.seed(7)
    sample = misc + random.sample(arts, min(25, len(arts))) + random.sample(cases, min(8, len(cases))) + sols
    print(f"sitemap总数={len(locs)} 文章={len(arts)} 案例={len(cases)} 行业方案={len(sols)} 其他={len(misc)}")
    print(f"抽样={len(sample)}\n")

    rows = []
    for u in sample:
        c = fetch(u)
        title = (re.findall(r"<title>(.*?)</title>", c, re.S) or [""])[0].strip()
        desc = (re.findall(r'<meta name="description" content="(.*?)"', c, re.S) or [""])[0]
        h1 = (re.findall(r"<h1[^>]*>(.*?)</h1>", c, re.S) or [""])[0]
        h1 = re.sub(r"<[^>]+>", "", h1).strip()
        canon = (re.findall(r'<link rel="canonical" href="(.*?)"', c) or [""])[0]
        body = re.sub(r"<script[\s\S]*?</script>", " ", c)
        body = re.sub(r"<style[\s\S]*?</style>", " ", body)
        body = re.sub(r"<[^>]+>", " ", body)
        body = re.sub(r"\s+", " ", body)
        ld = re.findall(r'application/ld\+json">([\s\S]*?)</script>', c)
        ldtypes = re.findall(r'"@type":"(\w+)"', " ".join(ld))
        imgs = re.findall(r'<img[^>]+src="([^"]+)"', c)
        internal = re.findall(r'href="https://openai2000\.cn(/[^"#]*)"', c)
        rows.append(dict(url=u.replace("https://openai2000.cn", ""), len=len(c),
                         title=title, desc=desc, h1=h1, canon=canon.replace("https://openai2000.cn", ""),
                         text=len(body), ld=",".join(uniq(ldtypes)),
                         imgs=len(imgs), uniq_imgs=len(set(imgs)), internal=len(set(internal))))

    print("== 每页指标 ==")
    for r in rows:
        flag = []
        if r["text"] < 800: flag.append("薄内容")
        if not r["h1"]: flag.append("缺H1")
        if r["canon"] != r["url"]: flag.append("canonical不符")
        if r["ld"] == "": flag.append("无结构化数据")
        print(f'{r["url"][:44]:46} html={r["len"]:>6} 正文={r["text"]:>6} H1={r["h1"][:18]:20} img={r["imgs"]}/{r["uniq_imgs"]} 内链={r["internal"]:>3} ld={r["ld"][:30]:32} {" ".join(flag)}')

    print("\n== 标题重复 ==")
    for t, n in Counter(r["title"] for r in rows).most_common():
        if n > 1: print(f"{n}x {t}")

    print("\n== 描述重复 ==")
    for t, n in Counter(r["desc"] for r in rows).most_common():
        if n > 1: print(f"{n}x {t[:100]}")

    print("\n== 标题长度分布 ==")
    for r in rows:
        L = len(r["title"])
        if L > 30 or L < 12:
            print(f'{L:>3} {r["title"]}  <-{r["url"][:40]}')

    print("\n== 正文长度分布 ==")
    tl = sorted(r["text"] for r in rows)
    print(f"min={tl[0]} p50={tl[len(tl)//2]} max={tl[-1]}")

    print("\n== 图片复用 ==")
    allimg = Counter()
    for r in rows:
        allimg[r["uniq_imgs"]] += 1
    print("uniq图片数为1的页面比例:", sum(1 for r in rows if r["uniq_imgs"] <= 1), "/", len(rows))

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audit_result.json")
    json.dump(rows, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("\n明细已存:", out)

main()

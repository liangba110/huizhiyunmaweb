# 汇智云码官网 SEO 审计报告

审计时间：2026-09-15
站点：https://openai2000.cn（nginx / 82.157.202.24 腾讯云，源站 `/data/web/huizhiyunma/`）
架构：Vue3 SPA（Vite 构建） + nginx UA 嗅探 prerender + 20 个城市子域站群
审计方式：全量 sitemap 366 URL 状态码校验 + 216 页抽样静态解析 + 跨域内容相似度比对

---

## 一、现状盘点（做得对的）

| 项 | 状态 |
|---|---|
| HTTPS + HSTS + http/www 301 归一 | ✅ |
| robots.txt + 3 个 sitemap，可访问 | ✅ |
| 全站 366 URL 状态码 200，无死链 | ✅ |
| 百度站长验证 `codeva-geushDpNvl` | ✅ |
| 百度统计 | ✅ |
| Prerender（nginx UA 白名单） | ✅ 覆盖 Baiduspider / Sogou / 360 / Googlebot / bingbot / Bytespider / Yandex |
| 结构化数据 | ✅ 首页 Organization+WebSite+FAQPage；文章页 Article+BreadcrumbList+FAQPage |
| canonical 正确、无标题重复 | ✅ |
| 伪静态 URL（/articles/1 而非 ?id=1） | ✅ |
| gzip 压缩 | ✅ |

## 二、问题清单（按影响排序）

### P0-1 城市站群内容近似重复 —— 最大风险

同一个 `/data/web/huizhiyunma/` 部署出 20 个城市子域（beijing/qingdao/shanghai…），页面正文高度雷同：

| 路径 | 主站 vs 城市站相似度 | 判定 |
|---|---|---|
| /articles | **95.7%** | 几乎完全相同 |
| /services | **84.5%** | 高度重复 |
| /about | 75% | 高度重复 |
| / | 61–66% | 明显重复 |

20 子域 × 8 页 = 160 个近似重复 URL。这是典型"站群薅收录"，属百度《惊雷算法》打击对象，风险是**主站一并降权**，而非只惩罚子域。

### P0-2 sitemap 混入子域 URL

- `sitemap.xml` 366 条中 **160 条是子域 URL**（20 城市 × 8 页），sitemap 规范只应包含所属站点自身 URL。
- 城市站 `robots.txt` 是主站文件的**完整拷贝**，Sitemap 指向主站 sitemap → 城市站自身没有任何收录入口，且把主站 sitemap 当成自己的。

### P0-3 城市站无独立站体信息

20 个子域共用同一 Organization、同一电话 `18766202024`、同一地址（青岛胶州）。多站指向同一实体，EEAT 与站点真实性存疑，加重 P0-1 判定。

### P1-1 同题文章重复（已定位 6 组）

| 对比 | 相似度 | 标题差异 |
|---|---|---|
| 21 ↔ 67 | 26.4% | 「成本构成与报价**解析**」vs「成本构成与报价**全解析**」 |
| 10 ↔ 32 | 22.4% | 「流程与周期**完整指南**」vs「流程与周期：**从需求到上线的关键步骤**」 |
| 12 ↔ 13 | 21.8% | 「框架**选择**指南」vs「框架**选型**指南」 |
| 48 ↔ 58 | 41.4% | 「中小企业破局关键」vs「中小企业的破局关键」 |
| 55 ↔ 71 | **48.1%** | 「**避坑**指南」vs「**选型**指南」 |
| 29 ↔ 75 | 31.9% | 「小程序上架审核…」vs「微信小程序上架审核…（2026）」 |

百度判重后只会保留一篇，其余永久不收录，等于白写。

### P1-2 图片全线失效，图片搜索 0 流量

- 216 个抽样页中 **213 页的独立图片数 ≤ 1**（绝大多数为 0 图）。
- 详情页引用的 `/images/articles/placeholder.jpg` → **HTTP 404**。
- `og:image` 声明的 `/seo/images/og-cover.png` 只有 **352 字节**（坏图/占位），微信与社交分享无缩略图。

### P1-3 薄内容页（正文 < 800 字）

| 页面 | 正文字数 |
|---|---|
| /contact | 380 |
| /about | 447 |
| /templates | 581 |
| /solutions/wedding、realestate、agriculture | 586 |
| /solutions/beauty | 718 |
| /solutions/catering | 730 |
| /cases/5、/cases/7 | 624 / 653 |

合计 22 页（10%）。共 13 个 `/solutions/*` 行业页有 7 页属薄内容。

### P1-4 内链结构失衡

- `/articles` 列表页一次性渲染 124 篇，页面 49KB、128 条内链，权重堆在列表页。
- 文章详情页仅 17–19 条内链，且模板化（导航+面包屑），正文内**无上下文内链**（指向 /packages 的链接为 0）。

### P2-1 多平台/多终端覆盖缺失

| UA / 场景 | 拿到 | 问题 |
|---|---|---|
| Baiduspider / Googlebot / bingbot / 360 / Sogou / Bytespider | prerender 14.5KB ✅ | — |
| **ChatGPT-User** | 空壳 2.1KB ❌ | AI 搜索抓不到内容 |
| **PerplexityBot** | 空壳 2.1KB ❌ | 同上 |
| **Applebot** | 空壳 2.1KB ❌ | Siri / Spotlight 无内容 |
| **微信内置浏览器** | 空壳 2.1KB ❌ | 分享/搜一搜无内容（注意：SPA 客户端会渲染，但抓取端拿不到） |

### P2-2 缺失站长验证 / 社交 meta

- 缺 `msvalidate.01`（Bing 站长）
- 缺 `google-site-verification`（Google Search Console）
- 缺 `twitter:card`
- 缺 `hreflang`（当前单语言，可暂缓）

### P2-3 结构化数据质量问题

文章页 `Article` 的 `datePublished` / `dateModified` 值为 **`"Fri Jul 10"`** —— 非 ISO 8601 格式，**非法**，富媒体结果会校验失败。同时缺 `image` 字段（富媒体必需），`author` 用 Organization 而非 Person。

### P2-4 首页 H1 关键词堆砌

`<h1>汇智云码科技 - 企业网站建设 · 小程序开发 · APP定制开发</h1>` 与 title 高度重复且塞入 3 组关键词，H1 应单一表达页面主题。

### P2-5 头部 id/属性低效

首页 Title 与 og:title 重复冗余，关键词 meta 在主流引擎已弱化但保留无害。

---

## 三、修复方案（分三批）

### 批次 1｜止险（最高优先，预计 1 天）

1. **止血城市站群**（三选一，需阿亮决策）
   - 方案 A（推荐）：**保留 3–5 个核心城市**（青岛+山东省内+1 个外省），其余 15+ 个子域 **301 到主站**，停止解析。
   - 方案 B：城市站内容**真正差异化**（各城本地案例、本地价格、本地服务地址），成本高但留存 SEO 价值。
   - 方案 C：全部子域 301 到主站，集中权重做单站。
2. `sitemap.xml` 剔除全部子域 URL；城市站（若保留）生成**独立 sitemap + 独立 robots.txt**。
3. 合并 6 组重复文章 → 301 到保留篇（保留字数多、更完整的那篇）。
4. 修复图片：生成真实封面图（DeepSeek/硅基流动出图 + 站点品牌模板），替换 404 的 placeholder，修复 og:image。

### 批次 2｜基础完善（预计 1–2 天）

5. 补齐 22 个薄内容页正文至 1200–2000 字（/about、/contact、/templates、7 个 /solutions/*）。
6. 修复 Article 结构化数据：ISO 8601 日期、补 `image`、`author` 改 Person。
7. 补 `msvalidate.01`、`google-site-verification`、`twitter:card`。
8. 改写首页 H1 为单一主题。

### 批次 3｜进阶（预计 2–3 天）

9. prerender UA 白名单增加：ChatGPT-User、PerplexityBot、Applebot、微信 UA（覆盖 AI 搜索与微信生态）。
10. 正文上下文内链建设：每篇文章正文 3–5 条指向 /services、/packages、相关行业方案的自然内链。
11. 新增栏目页支撑长尾：`/articles` 按分类切分（成本类/流程类/技术选型类/行业方案类），列表页分页。
12. 百度主动推送脚本修复（本地 `baidu_push.sh` 存在但 URLS 拼接逻辑损坏，且 token 未确认）+ 接入 Bing/Google 索引 API。

---

## 四、执行前需要阿亮决策的三件事

1. **城市站怎么处理**（方案 A / B / C）——这是最大风险点，也决定后续工作量。
2. **服务器访问方式**：SSH 到 `82.157.202.24` 当前公钥被拒（本地 id_ed25519 / id_sftpa 均失败），需要密码、宝塔面板账号或加公钥。站点源站为 `/data/web/huizhiyunma/`（宝塔环境，/bt/ 入口在 30551 端口）。
3. **文章是否可删可合并**：6 组重复文章如果都靠 SEO 引流量，合并需要设置 301，请确认可以改。

---

## 附：审计脚本与原始数据

- `E:\aiauto\汇智云码\seo-audit\crawl_audit.py` —— 216 页抽样指标（标题/描述/正文长度/图片/内链/结构化数据），结果 `audit_result.json`
- `E:\aiauto\汇智云码\seo-audit\check_links_dup.py` —— 366 URL 状态码全量校验 + 跨域相似度，结果 `broken_links.json` / `dup_similarity.json`
- `E:\aiauto\汇智云码\seo-audit\check_issues.py` —— sitemap 跨域、同题文章相似度、图片有效性、meta 检测

---

# 第二部分：执行记录（2026-09-15 当日完成，全部线上实跑验证）

## P0 技术入口（已完成）

| 项 | 前 | 后 |
|---|---|---|
| sitemap URL 数 | 366（含 160 条子域 URL） | 160（0 子域 URL） |
| 非爬虫 UA 渲染体积 | 2.1 KB 空壳 | 21,383 字节 |
| AI 搜索 UA（ChatGPT-User / PerplexityBot / Applebot / 微信） | 漏白名单 | 已补，可拿到完整内容 |
| 非白名单城市 robots/sitemap | 全部 200 | 404（已清理） |
| 城市子域首页 `try_files $uri/` 隐藏 bug | 命中 dist 根目录 | 已修 |

## P1 存量清理（已完成）

- **重复文章合并**：124 → 74 篇（14 簇 50 篇，bigram Jaccard 阈值 0.50）
  - 处理方式：`status=0` + 301，**不物理删除**；映射表 `/etc/nginx/seo-redirects.conf`（50 条 × 3 路径形态，单跳验证通过）
  - 磁盘残留 50 个静态页已移入 `/data/disk/backups/huizhiyunma_merged_statics_*/`
- **薄内容扩写**：services 1292→3422、about 404→2506、contact 430→1795、templates 565→1814 字
- 首页 H1 收敛为单一主题「青岛小程序开发与 APP 定制开发服务」

## P2 内容与结构（已完成）

- 14 个行业页：584–1341 → 2317–3066 字
- `/solutions` 索引页：859 → 2439 字
- 首页：2743 → 4675 字
- `/articles/page/2..4` 分页：列表页 48 KB → 23 KB，越界 page/99 → 404，已进 sitemap
- 结构化数据落地：`faqSchema()`（首页/services/14 行业页/全部文章/全部案例）、`breadcrumbSchema()`
- 内链建设：services/about/contact/templates/cases 页尾「相关页面」
- 百度推送修复：手动通道（提交到需登录页）无效 → 改自动转 IndexNow + 落盘排队次日重试
- IndexNow 全站 159 条推送成功

## P3 城市站群收窄（已完成）

**doorway page 测量**（收窄前）：5 城两两相似度 77.3%–88.5%；去城市名后 78.6%–89.9%；每城可见文字 3505–3577 字、差异仅 72 字（~2%）→ 判定为门页。

**决策**：白名单 5 城（青岛/济南/烟台/潍坊/临沂）→ **2 城（青岛 + 济南）**，仅改 `backend/seo/city-whitelist.json`，未改代码结构。

**本地化差异内容**：为青岛/济南各写独立正文（`CITY_DEEP`），相似度 **77% → 58.4%**

| | 青岛 | 济南 |
|---|---|---|
| 正文量 | 4079 字 | 4260 字 |
| 服务模式 | 本地团队常驻、可上门驻场 | 远程协作 + 关键节点驻场 |
| 产业方向 | 外贸跨境、家电智造配套、餐饮零售、海洋港口物流 | 政务国企、软件信息、教育医疗、装备制造 |
| 独有内容 | 胶州办公地址、西海岸/城阳/即墨服务范围、上合示范区 | 高铁通勤说明、等保信创适配边界、齐鲁软件园、招投标配合 |

济南段额外写明**合规边界**：等保只做应用层设计并配合测评、不代替测评机构承诺通过；投标资质逐项核对、不具备的如实告知不虚假承诺。

**顺带修掉两个影响面更大的既有 bug：**

1. **城市子域 `/cases`、`/articles` 对真实访客 403** —— nginx 城市段 `try_files $uri $uri/` 的 `$uri/` 命中 `dist/cases/`、`dist/articles/` 目录，先 301 补斜杠再 403 目录列表。**影响全部 299 个城市子域**所有点导航的用户。已改为城市自有路由 + 去掉 `$uri/`。
2. **软 404** —— 未知路径在城市子域返回 200 + canonical 指向城市首页（等于告诉搜索引擎这些页是首页副本）。已改真实 404。

另：城市详情页 rewrite 原指向生成器从未产出的文件 → 改为 301 到主站对应详情页。

## P4 全站细节优化（已完成）

| 项 | 前 | 后 |
|---|---|---|
| 可见面包屑导航 | 全站 0（只有 BreadcrumbList schema） | 各栏目页/详情页/行业页/分页页全有 |
| 案例详情页相关案例内链 | 0 | 每页 4 条（同分类优先） |
| 案例页正文 | 594–683 字 | 1530–1592 字 |
| `/city` 城市导航页 | 301 → 403 | 200（99 KB，已进 sitemap） |
| 404 页 canonical | 指向 `/404` | 已移除 |
| 图片 loading="lazy" | 60 处缺失 | 仅剩 1 处 |
| 全站内链健康度 | 50 个目标 301 | **162/162 全 200，0 个 301/404** |

**内链死链根因**：合并文章后，历史静态页仍缓存着指向已下架文章的链接（`/articles/12` 被 19 个页面引用）。因生成器读取的是 `status=1` 集合，重新生成后即消失；同时清理了磁盘上 50 个已下架文章的静态文件。

## 最终状态

```
sitemap            160 条（0 子域 URL）
文章静态页          74 个（原 124，下架 50）
案例页              59 个
行业页              15 个
白名单城市          2 个（青岛/济南），各 8 页 index,follow + 独立 robots/sitemap
其余 297 城         8 页全 noindex,follow，robots/sitemap 返回 404
全站内链            162/162 全部 200
IndexNow            主站 159 条 + 青岛 8 条 + 济南 8 条，全部推送成功
```

## 回滚点

| 回滚目标 | 方式 |
|---|---|
| 城市白名单回 5 城 | 恢复 `city-whitelist.json.bak_p3_*` |
| 城市本地化内容 | 恢复 `generate.js.bak_p3_*` |
| 文章合并 | `/data/disk/backups/articles_20260915_202846/` 全量 dump + `merge-rollback.json` |
| 下架文章静态页 | `/data/disk/backups/huizhiyunma_merged_statics_*/` |
| nginx 所有改动 | `sites-enabled/huizhiyunma.bak_*`；301 清空 `seo-redirects.conf` 即还原 |
| generate.js | 每个阶段均有 `.bak_p0_*` / `.bak_p1_*` / `.bak_p2_*` / `.bak_p3_*` / `.bak_p4_*` |

**未删除任何内容**（一律 status=0 或移至备份区）；未改数据库结构；未动 SPA 业务代码。

## 仍待处理

1. **Bing `msvalidate.01` / Google `google-site-verification`** —— 需阿亮提供验证码
2. **济南站去留** —— 目前为纯线上服务模式，若无实际成交意图，可考虑收窄为 1 城（青岛）
3. 分类页尚未独立做静态页（当前 `/articles` 已分页）
4. 外链建设（内容侧已优化到位，链接侧需站外投入）

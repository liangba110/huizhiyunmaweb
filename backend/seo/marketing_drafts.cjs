#!/usr/bin/env node
/**
 * 汇智云码科技 - 自媒体营销草稿自动生成器
 * 每天读取当日发布文章，生成百家号/知乎/小红书/抖音/公众号五平台营销草稿
 * 输出目录：/data/web/huizhiyunma/marketing-drafts/YYYYMMDD/
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://www.openai2000.cn';
const OUT_ROOT = path.join(__dirname, '..', '..', 'marketing-drafts');
const ARK_KEY = process.env.ARK_API_KEY || '';
const ARK_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3') + '/chat/completions';
const ARK_MODEL = process.env.ARK_MODEL || 'ark-code-latest';
const YEAR = new Date().getFullYear();

const PLATFORMS = [
  {
    key: 'baijiahao',
    name: '百家号',
    rule: `面向百度搜索用户，输出适合百家号发布的原创图文：
- 标题≤30字，含核心关键词
- 正文800-1200字，分3-5个小标题
- 文末附一句引导：完整版见官网文章
- 附5个标签
- 发布时间建议：09:30`,
  },
  {
    key: 'zhihu',
    name: '知乎',
    rule: `面向知乎搜索用户，以专业回答口吻输出：
- 标题改写成问题形式，如“XX怎么做？”
- 正文800-1200字，先给结论再展开
- 文末引导：完整分析与案例见官网文章
- 发布时间建议：20:00`,
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    rule: `面向小红书用户，输出图文笔记：
- 标题≤20字，可带少量emoji，突出痛点
- 正文600-800字，短句分段，可用emoji
- 结尾引导：完整版与报价模板见官网文章
- 附5-8个话题标签（#开头）
- 封面文案一行（≤12字）
- 发布时间建议：12:00或19:00`,
  },
  {
    key: 'douyin',
    name: '抖音图文',
    rule: `面向抖音用户，输出图文/口播脚本：
- 6-8屏分镜，每屏正文≤50字
- 第1屏给封面文案（≤12字，抓痛点）
- 每屏标注画面建议（1句话）
- 附BGM风格建议
- 结尾引导：完整版见官网文章
- 附3-5个话题标签
- 发布时间建议：07:30或18:30`,
  },
  {
    key: 'wechat',
    name: '公众号',
    rule: `面向公众号订阅用户，输出图文：
- 标题≤30字
- 摘要80字
- 正文800-1200字，分3-5个小标题
- 文末引导：阅读原文跳转官网文章
- 发布时间建议：08:00`,
  },
];

function shq(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function notify(msg) {
  try {
    execSync(`bash /data/disk/notify_qq.sh ${shq(msg)}`, { stdio: 'ignore' });
  } catch (e) { /* 通知失败不影响主流程 */ }
}

async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 2,
  });
}

async function getArticles(pool, date) {
  const [rows] = await pool.query(
    `SELECT id, title, category, summary, content FROM articles
     WHERE status = 1 AND DATE(published_at) = ?
     ORDER BY published_at DESC`,
    [date]
  );
  return rows;
}

async function callDeepSeek(system, user) {
  // 模型优先级：主模型 ark-code-latest（2026-09-11 切换）
  const providers = [];
  if (ARK_KEY) providers.push({ name: 'Ark', url: ARK_URL, key: ARK_KEY, model: ARK_MODEL });
  let lastErr = null;
  for (const prov of providers) {
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await fetch(prov.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${prov.key}`,
          },
          body: JSON.stringify({
            model: prov.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.8,
            max_tokens: 4000,
          }),
        });
        if (!resp.ok) {
          const err = await resp.text();
          console.log(`⚠️ ${prov.name} API 错误 ${resp.status}: ${err.slice(0, 150)}`);
          lastErr = new Error(`${prov.name} API ${resp.status}: ${err.slice(0, 200)}`);
          break; // HTTP错误重试无意义，换下一个模型
        }
        const data = await resp.json();
        const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!raw || !raw.trim()) {
          lastErr = new Error(`${prov.name} 返回空内容`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        return raw.trim();
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  throw lastErr || new Error('AI(Ark)调用失败');
}

function makeSystem() {
  return `你是企业软件开发行业的资深新媒体运营专家。
当前年份是${YEAR}年，所有时间表述一律使用${YEAR}年，不得使用更早或更晚年份。
【合规红线】
1. 不使用广告法极限词和绝对化用语：如"国家级、世界级、顶级、最好、第一、唯一、全网最低、最便宜、最低价、史上最低、最强、最先进、100%、百分百、绝对、保证、承诺、稳赚"等。
2. 不虚构客户数据、不夸大效果、不承诺收益。
3. 不得引导站外加微信/QQ等违规导流，只能引导访问官网文章（https://www.openai2000.cn/articles/序号），个人号场景可用"完整版见官网文章"。
 4. 内容原创、专业、可信。
 5. 输出中不要出现任何“合规自查”“极限词清单”“已规避”等元说明文字；除非是“第一步”“第一档”等序号用法，否则不要写出“第一、最、绝对”等词语本身。`;
}

async function genDraft(article) {
  const url = `${SITE}/articles/${article.id}`;
  const contentText = String(article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2600);
  const base = `【文章信息】
标题：${article.title}
分类：${article.category}
摘要：${article.summary || ''}
正文：${contentText}
官网链接：${url}`;

  for (const p of PLATFORMS) {
    console.log(`>>> 生成 ${p.name} 草稿：${article.title}`);
    const user = `${base}

【平台要求】${p.rule}
 请输出Markdown，包含：## 标题、## 正文、## 话题标签、## 发布时间建议、## 备注（发布注意点）。备注只写1-2条发布操作要点（如配图建议），不要写合规说明。`;
    const text = await callDeepSeek(makeSystem(), user);
    const md = `# ${article.title}

> 官网原文：${url}

${text}
`;
    const fname = `${String(article.id).padStart(3, '0')}-${p.key}.md`;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, fname), md, 'utf8');
    await new Promise(r => setTimeout(r, 500));
  }
}

let OUT_DIR = '';

async function main() {
  const dateArg = process.argv[2] || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const date = dateArg.length === 8 ? `${dateArg.slice(0,4)}-${dateArg.slice(4,6)}-${dateArg.slice(6,8)}` : dateArg;
  const outDate = date.replace(/-/g, '');
  const pool = await getPool();
  try {
    const articles = await getArticles(pool, date);
    OUT_DIR = path.join(OUT_ROOT, outDate);
    console.log(`[${new Date().toLocaleString('zh-CN')}] 当日文章数：${articles.length}`);
    if (articles.length === 0) {
      console.log('今日无新增文章，跳过草稿生成。');
      return;
    }
    const links = [];
    for (const a of articles) {
      await genDraft(a);
      links.push(`- ${a.title}：${SITE}/articles/${a.id}`);
    }

    const index = `# 自媒体营销草稿 ${date}

## 今日文章
${links.join('\n')}

## 发布节奏建议
| 平台 | 建议时间 | 操作 |
|---|---|---|
| 百家号 | 09:30 | 复制 md 内容发布 |
| 公众号 | 08:00 | 排版后发布，附官网链接 |
| 小红书 | 12:00 / 19:00 | 图文发布，附话题 |
| 抖音 | 07:30 / 18:30 | 图文或口播，附话题 |
| 知乎 | 20:00 | 回答/文章发布 |

> 发布前检查：标题无极限词、无虚构数据、年份为${YEAR}年。
`;
    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), index, 'utf8');
    console.log(`✅ 草稿已生成：${OUT_DIR}`);
    notify(`✅ 自媒体营销草稿已生成（${articles.length}篇）
目录：/data/web/huizhiyunma/marketing-drafts/${date}
包含：百家号/知乎/小红书/抖音/公众号`);
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error('❌ 生成失败:', e.message);
  notify(`❌ 自媒体营销草稿生成失败：${e.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * 汇智云码科技 - AI 案例自动生成器
 * 功能：调用 DeepSeek 生成高质量「客户案例」写入 cases 表，
 *       完成后自动重建静态页+sitemap（generate.js），并触发百度推送（push_baidu.sh new）
 *
 * 用法：
 *   node generate_case.js batch 30   # 批量生成 30 篇案例（已存在标题自动跳过）
 *   node generate_case.js daily      # 每日模式：当天已有案例则跳过，否则生成 1 篇
 *   node generate_case.js list       # 打印当前案例数量
 *
 * 注意：
 *   - 静态页目录 frontend/dist 属主为 www-data，建议经 sudo -u www-data 运行
 *     （run_case_daily.sh 已处理；手动运行可：sudo -u www-data node generate_case.js batch 30）
 *   - 不修改 generate_article.js / generate.js / push_baidu.sh 的业务逻辑
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARK_KEY = process.env.ARK_API_KEY || '';
const ARK_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3') + '/chat/completions';
const ARK_MODEL = process.env.ARK_MODEL || 'ark-code-latest';

// 违禁词过滤模块（广告法极限词/违法内容），参考 generate_article.js 用法
let wordFilter = null;
try { wordFilter = require('./word_filter'); } catch (e) { console.log('⚠️ word_filter 模块加载失败:', e.message); }

// ============ 案例选题池（30 个差异化场景，覆盖 小程序/App/网站） ============
// category: 小程序 / App / 网站；每个场景描述具体业务，场景间关键词差异明显，
// 保证一次批量 30 篇不会出现同行业近重复标题
const TOPICS = [
  { category: '小程序', industry: '餐饮',       prompt: '连锁餐饮品牌的点餐与会员运营小程序' },
  { category: '小程序', industry: '零售',       prompt: '连锁零售门店的扫码购与会员营销小程序' },
  { category: '网站',   industry: '教育',       prompt: 'K12 教育机构的在线课程与招生官网' },
  { category: 'App',    industry: '医疗',       prompt: '连锁门诊机构的预约挂号与在线问诊 App' },
  { category: 'App',    industry: '物流',       prompt: '物流企业的司机接单与调度管理 App' },
  { category: '网站',   industry: '制造',       prompt: '制造企业的官网升级与产品选型展示站' },
  { category: '小程序', industry: '律所',       prompt: '律师事务所的案件进度查询与预约小程序' },
  { category: '网站',   industry: '酒店',       prompt: '连锁酒店集团的直连预订官网与会员体系' },
  { category: '网站',   industry: '跨境',       prompt: '跨境电商卖家的品牌独立站' },
  { category: '小程序', industry: '社区团购',   prompt: '社区团购平台的团长端与用户端小程序' },
  { category: '小程序', industry: '美业',       prompt: '美容美发门店的在线预约与会员储值小程序' },
  { category: '小程序', industry: '健身',       prompt: '健身工作室的课程预约与私教管理小程序' },
  { category: '小程序', industry: '家政',       prompt: '家政服务平台的阿姨接单与用户下单小程序' },
  { category: '小程序', industry: '宠物',       prompt: '宠物门店的洗护预约与商品商城小程序' },
  { category: '小程序', industry: '汽车后市场', prompt: '汽车养护连锁的预约保养与会员小程序' },
  { category: 'App',    industry: '电商直播',   prompt: '直播电商机构的主播管理与人货场匹配 App' },
  { category: 'App',    industry: '金融科技',   prompt: '金融科技企业的客户经营与合规展业 App' },
  { category: '网站',   industry: 'SaaS',       prompt: 'SaaS 软件公司的产品官网与在线试用站' },
  { category: '网站',   industry: 'OA办公',     prompt: '企业 OA 办公系统的门户与移动端页面' },
  { category: '网站',   industry: 'CRM',        prompt: '企业级 CRM 客户管理系统的官网与后台' },
  { category: '网站',   industry: '进销存',     prompt: '批发贸易企业的进销存管理系统' },
  { category: '网站',   industry: '智慧园区',   prompt: '产业园区智慧运营管理平台' },
  { category: '小程序', industry: '生鲜配送',   prompt: '生鲜电商的前置仓配送与下单小程序' },
  { category: 'App',    industry: '旅游出行',   prompt: '旅行社的行程预订与导览 App' },
  // 补充差异化子场景，使选题池达到 30 个
  { category: '网站',   industry: '职业培训',   prompt: '职业培训机构（驾校/技能培训）的招生与约课官网' },
  { category: '小程序', industry: '养老',       prompt: '社区养老服务站的预约上门与健康档案小程序' },
  { category: 'App',    industry: '国际物流',   prompt: '国际货代公司的运单跟踪与报价 App' },
  { category: '小程序', industry: '药品零售',   prompt: '连锁药房的在线购药与会员健康小程序' },
  { category: 'App',    industry: '汽修',       prompt: '汽修连锁门店的维修进度与会员 App' },
  { category: '小程序', industry: '本地生活',   prompt: '同城生活服务（洗衣/维修）平台小程序' },
];

// 客户匿名命名模板（按行业生成“某知名XX品牌 / 某连锁XX / 某XX企业”，合规匿名）
function anonClientName(industry) {
  const maps = {
    '餐饮': '某知名连锁餐饮品牌',
    '零售': '某知名连锁零售品牌',
    '教育': '某知名教育培训机构',
    '医疗': '某连锁门诊医疗机构',
    '物流': '某区域性物流企业',
    '制造': '某中型制造企业',
    '律所': '某知名律师事务所',
    '酒店': '某连锁酒店集团',
    '跨境': '某跨境电商企业',
    '社区团购': '某社区团购平台',
    '美业': '某连锁美业门店品牌',
    '健身': '某连锁健身工作室',
    '家政': '某家政服务企业',
    '宠物': '某连锁宠物门店品牌',
    '汽车后市场': '某连锁汽车养护品牌',
    '电商直播': '某直播电商机构',
    '金融科技': '某持牌金融科技企业',
    'SaaS': '某SaaS创业公司',
    'OA办公': '某集团型企业',
    'CRM': '某企业服务公司',
    '进销存': '某批发贸易企业',
    '智慧园区': '某产业园区运营公司',
    '生鲜配送': '某生鲜电商企业',
    '旅游出行': '某旅行社企业',
    '职业培训': '某职业培训机构',
    '养老': '某社区养老服务企业',
    '国际物流': '某国际货代企业',
    '药品零售': '某连锁药房品牌',
    '汽修': '某连锁汽修门店品牌',
    '本地生活': '某同城生活服务平台',
  };
  return maps[industry] || `某${industry}企业`;
}

// ============ 公司背景（让案例贴合真实公司业务） ============
const COMPANY_BG = `公司背景：汇智云码科技是一家专业软件开发公司，总部位于山东青岛，核心团队来自腾讯、阿里、字节等互联网大厂。
主营业务：
- APP定制开发（iOS/Android/Flutter全平台，已交付60+款上线App）
- 小程序定制开发（微信/支付宝/抖音/百度，已服务50+商家）
- 网站/SaaS系统开发（Vue3+Node.js+MySQL全栈，响应式、私有化部署）
- UI/UX设计、运维支持、技术咨询
已服务120+企业客户，交付200+项目。`;

// ============ 工具函数 ============
function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// 生成后的内容需包含的核心小节
const REQUIRED_SECTIONS = ['项目背景', '客户痛点', '解决方案', '技术架构', '量化成果', '客户评价'];

function checkSections(html) {
  if (!html) return [];
  return REQUIRED_SECTIONS.filter(sec => !html.includes(sec));
}

// ============ 调用 DeepSeek 生成单篇案例 ============
async function callDeepSeek(topic, topicSeq) {
  const currentYear = new Date().getFullYear();
  const clientName = anonClientName(topic.industry);

  const system = `你是一位资深的企业数字化顾问，为软件开发公司撰写真实感强的客户案例。
【当前年份】${currentYear} 年。案例中的时间、数据必须是${currentYear}年及以前的合理表述，不虚构未来年份。

【合规红线（必须严格遵守）】
1. 客户名称一律匿名：只能用"${clientName}"这类表述，或"某连锁XX企业""某XX公司"，禁止出现任何真实或疑似真实的品牌名、人名、地名。
2. 严禁广告法极限词与绝对化用语：不得使用"最、第一、顶级、顶尖、最佳、最优、100%、百分百、绝对、唯一、全网最低、遥遥领先、领导者、行业领军"等表述。
3. 成果数据用可信表述：如"提升约15%""效率提高20%左右""成本下降约12%"，不用夸张、无法验证的数据，不承诺收益。
4. 不涉及违法内容，不出现医疗疗效类表述。
5. 内容专业、客观、可信，与汇智云码科技的主营业务（小程序/App/网站定制开发）一致。

【写作要求】
1. 围绕「${topic.prompt}」撰写，属于${topic.category}类型项目。
2. 内容结构（HTML，用<h3>小节标题 + <p>段落，不含<ul>等复杂标签）依次为：
   <h3>项目背景</h3> → <h3>客户痛点</h3> → <h3>解决方案</h3> → <h3>技术架构</h3> → <h3>量化成果</h3> → <h3>客户评价</h3>
   六节齐全，顺序一致，每个小节 1-3 段。
3. 全文去掉 HTML 标签后 600-1000 字，内容具体（如提到业务场景、模块、流程、技术选型），避免空话套话。
4. 技术架构一节给出真实可信的技术栈（如微信小程序原生 / Flutter / Vue3 + Node.js + MySQL + Redis 等），不出现竞品品牌对比贬低。
5. 客户评价用客户方口吻简短引用（如"上线后整体体验明显改善……"），注意不违反合规红线。
6. 标题 12-25 字，体现行业与类型，如"某连锁餐饮品牌点餐小程序开发案例"。
7. description 为 60-120 字的摘要，概括背景与成果，不含违禁词。

${COMPANY_BG}`;

  const user = `请为「${topic.prompt}」撰写 1 篇完整客户案例（${topic.category}类型）。
输出 JSON（不要输出其他文字）：
{
  "title": "案例标题（12-25字）",
  "description": "摘要（60-120字）",
  "technologies": "技术栈，用 + 连接，如：微信小程序 + Node.js + MySQL + Redis",
  "content": "完整HTML内容（六节齐全，去标签后600-1000字）"
}`;

  // deepseek-flash 为推理模型：偶发返回 HTTP 200 但 message.content 为空
  // （仅返回 reasoning_content），此处即时校验空内容并重试两次
  let data = null;
  // 模型优先级：主模型 ark-code-latest（2026-09-11 切换）
  const providers = [];
  if (ARK_KEY) providers.push({ name: 'Ark', url: ARK_URL, key: ARK_KEY, model: ARK_MODEL });

  outer:
  for (const prov of providers) {
    for (let reqTry = 1; reqTry <= 3; reqTry++) {
      const resp = await fetch(prov.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${prov.key}`
        },
        body: JSON.stringify({
          model: prov.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.85,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.log(`⚠️ ${prov.name} API 错误 ${resp.status}: ${err.slice(0, 200)}`);
        break; // HTTP错误重试无意义，换下一个模型
      }

      data = await resp.json();
      const choice = data.choices && data.choices[0];
      const raw = choice && choice.message && choice.message.content;
      if (!raw || typeof raw !== 'string' || !raw.trim()) {
        const reason = (choice && choice.finish_reason) || '无 choices';
        if (reqTry < 3) {
          console.log(`   ⚠️ ${prov.name} 返回空内容（finish_reason=${reason}），重新请求...`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        break outer; // 该模型连续空内容，换下一个
      }
      break outer;
    }
  }

  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content || !content.trim()) {
    throw new Error('AI(Ark)未返回有效内容');
  }

  // 解析 JSON（兼容可能的 markdown 包裹）
  const rawContent = data.choices[0].message.content;
  let jsonStr = String(rawContent).replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(jsonStr);

  // 字段完整性校验
  if (!parsed.title || !parsed.description || !parsed.content) {
    throw new Error('AI 返回结构不完整: ' + rawContent.slice(0, 200));
  }
  const contentLen = stripHtml(parsed.content).length;
  // 600-1000 字为任务目标，AI 推理模型常输出 1000-1600 字，放宽上限避免无谓重试
  if (contentLen < 600 || contentLen > 1600) {
    throw new Error(`content 长度不达标（${contentLen}字，要求600-1000字）`);
  }
  const missing = checkSections(parsed.content);
  if (missing.length) {
    throw new Error(`content 缺少小节: ${missing.join('、')}`);
  }

  return {
    title: String(parsed.title).trim(),
    client: clientName,
    category: topic.category,
    description: String(parsed.description).trim(),
    content: String(parsed.content).trim(),
    technologies: String(parsed.technologies || '').trim() || null,
    topicSeq,
  };
}

// 合规校验（title + description + content）
function validateCase(oneCase) {
  if (!wordFilter) return { ok: true, hits: [] };
  const result = wordFilter.validateArticle({
    title: oneCase.title,
    summary: oneCase.description,
    content: oneCase.content,
  });
  return result;
}

// ============ 数据库连接 ============
async function getPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    connectionLimit: 3,
  });
}

// ============ 选题轮换（按天轮换不重复） ============
// topicSeq 为"当天已成功生成数"，保证同一批/同一天内不重复选题，且跨天自动轮换
function pickTopic(seq) {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const idx = ((dayOfYear + seq) % TOPICS.length + TOPICS.length) % TOPICS.length;
  return TOPICS[idx];
}

// 查询 cases 表已有标题集合（用于批内去重）
async function loadExistingTitles(pool) {
  const [rows] = await pool.query('SELECT title FROM cases');
  return new Set(rows.map(r => String(r.title || '').trim()));
}

// 从既有案例标题/客户名推断行业关键词（用于批量选题去重）
function inferIndustriesFromCases(titles) {
  const industries = new Set();
  const kwMap = [
    ['餐饮', ['餐饮', '点餐', '外卖']],
    ['零售', ['零售', '扫码购', '导购']],
    ['教育', ['教育', 'K12', '课程', '招生']],
    ['医疗', ['医疗', '门诊', '医院', '问诊', '挂号']],
    ['物流', ['物流', '司机', '调度']],
    ['制造', ['制造', '工厂', 'ERP']],
    ['律所', ['律所', '律师', '案件']],
    ['酒店', ['酒店', 'PMS', '客房', '预订']],
    ['跨境', ['跨境', '独立站', '外贸']],
    ['社区团购', ['社区团购', '团购', '团长']],
    ['美业', ['美业', '美容', '美发', '美甲']],
    ['健身', ['健身', '私教']],
    ['家政', ['家政', '保洁', '阿姨']],
    ['宠物', ['宠物', '洗护']],
    ['汽车后市场', ['汽车后市场', '汽修', '汽车养护', '4S']],
    ['电商直播', ['直播电商', '主播', '直播带货']],
    ['金融科技', ['金融科技', '金融', '保险']],
    ['SaaS', ['SaaS']],
    ['OA办公', ['OA', '办公系统', '审批']],
    ['CRM', ['CRM', '客户管理']],
    ['进销存', ['进销存', '批发']],
    ['智慧园区', ['智慧园区', '园区']],
    ['生鲜配送', ['生鲜', '前置仓', '配送']],
    ['旅游出行', ['旅游', '旅行社', '出行']],
  ];
  for (const title of titles) {
    for (const [ind, kws] of kwMap) {
      if (kws.some(k => String(title).includes(k))) { industries.add(ind); break; }
    }
  }
  return industries;
}

// 批量选题：按槽位序号确定性轮换（dayOfYear + slot），天然跨天轮换、批内不连续重复。
// 行业不足时允许复用，由 generateCaseVariant 提示 AI 从不同角度撰写以区分内容。
function pickBatchTopic(slot) {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const idx = ((dayOfYear + slot) % TOPICS.length + TOPICS.length) % TOPICS.length;
  return TOPICS[idx];
}

// 同行业已有案例时，为提示词附加差异化要求：
// 明确禁用该行业关键词出现在标题中，强制从不同业务场景撰写，避免近重复标题
function generateCaseVariant(topic) {
  const kws = INDUSTRY_KW[topic.industry] || [];
  if (!kws.length) return topic;
  return {
    ...topic,
    prompt: `${topic.prompt}（该行业已有同类案例，本次请从不同业务环节/不同客户类型切入；
      标题【严禁】出现行业关键词：${kws.join('、')}；
      客户用"某区域性/某地方性/某中小规模企业"等差异化匿名表述，标题、方案、成果维度均须明显不同）`,
  };
}

// 标题模糊去重：提取标题关键词，用"最长公共子串"判定近重复标题
function titleKey(title) {
  return String(title || '')
    .replace(/某/g, '')
    .replace(/连锁|品牌|集团|知名|企业|公司|平台|机构|门店/g, '')
    .replace(/开发案例|定制开发|建设|系统|项目/g, '')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '');
}
function longestCommonSubstr(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > max) max = dp[i][j];
      }
    }
  }
  return max;
}
function isTitleSimilar(newTitle, existingTitles) {
  const key = titleKey(newTitle);
  if (!key || key.length < 6) return false;
  for (const t of existingTitles) {
    const ek = titleKey(t);
    if (!ek) continue;
    // 最长公共子串 ≥ 6 字（约等于"业务关键词串"级重复）视为近重复标题
    if (longestCommonSubstr(key, ek) >= 6) return true;
  }
  return false;
}

// 判断主题行业是否已被既有案例覆盖（标题含行业关键词即视为已覆盖）
const INDUSTRY_KW = {
  '餐饮': ['餐饮', '点餐'],
  '零售': ['零售', '扫码购', '导购'],
  '教育': ['教育', '课程', '招生'],
  '医疗': ['医疗', '门诊', '医院', '问诊', '挂号'],
  '物流': ['物流', '司机', '调度'],
  '制造': ['制造', '工厂'],
  '律所': ['律所', '律师', '案件'],
  '酒店': ['酒店', '客房'],
  '跨境': ['跨境', '独立站', '外贸'],
  '社区团购': ['社区团购', '团购', '团长'],
  '美业': ['美业', '美容', '美发'],
  '健身': ['健身', '私教'],
  '家政': ['家政', '保洁'],
  '宠物': ['宠物', '洗护'],
  '汽车后市场': ['汽车养护', '汽修', '汽车后市场'],
  '电商直播': ['直播电商', '主播', '直播带货'],
  '金融科技': ['金融科技', '金融'],
  'SaaS': ['SaaS', '软件即服务'],
  'OA办公': ['OA', '办公系统', '审批'],
  'CRM': ['CRM', '客户管理'],
  '进销存': ['进销存', '批发'],
  '智慧园区': ['智慧园区', '园区'],
  '生鲜配送': ['生鲜', '前置仓'],
  '旅游出行': ['旅游', '旅行社', '出行'],
  '职业培训': ['培训', '驾校', '职教'],
  '养老': ['养老', '康养'],
  '国际物流': ['国际物流', '货代', '国际货代'],
  '药品零售': ['药房', '药品', '医药零售'],
  '汽修': ['汽修', '维修保养', '汽服'],
  '本地生活': ['本地生活', '同城', '生活服务'],
};
function industryCovered(topic, existingTitles) {
  const kws = INDUSTRY_KW[topic.industry];
  if (!kws) return false;
  for (const title of existingTitles) {
    if (kws.some(k => String(title).includes(k))) return true;
  }
  return false;
}

// ============ 生成单篇（外层重试 3 次，间隔 60 秒） ============
// 每次尝试内部已含 DeepSeek 空内容即时重试；此处覆盖 API 失败 / 空 content / 违禁词 / 长度不达标
async function generateOne(pool, topic, topicSeq, existingTitles) {
  let lastErr = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const oneCase = await callDeepSeek(topic, topicSeq);
      if (existingTitles.has(oneCase.title)) {
        throw new Error(`标题已存在，跳过: ${oneCase.title}`);
      }
      if (isTitleSimilar(oneCase.title, existingTitles)) {
        throw new Error(`标题与已有案例近似: ${oneCase.title}`);
      }
      const v = validateCase(oneCase);
      if (!v.ok) {
        throw new Error(`命中违禁词【${v.hits.join('、')}】`);
      }
      return oneCase;
    } catch (e) {
      lastErr = e.message || String(e);
      if (attempt < 3) {
        // API 类错误（网络/超时）等 60 秒；内容质量问题（长度/缺节/违禁词）快速重试
        const isApiError = /API 错误|fetch failed|ECONN|ETIMEDOUT|Unexpected end/.test(lastErr);
        console.log(`   ⚠️ 第 ${attempt} 次生成失败（${lastErr}），${isApiError ? '60' : '5'} 秒后重试...`);
        await new Promise(r => setTimeout(r, isApiError ? 60000 : 5000));
      }
    }
  }
  throw new Error(`连续 3 次生成失败: ${lastErr}`);
}

// ============ 发布后处理：重建静态页 + 百度推送 + IndexNow ============
// 统一通过 sudo 以 www-data 身份执行：保证 frontend/dist 属主一致、
// push_baidu.log / push_indexnow.log（属主 www-data）可写
function nodeCmd() {
  const candidates = ['/home/ubuntu/.nvm/versions/node/v22.23.0/bin/node'];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return 'node';
}

async function regenerateStatic() {
  const results = [];
  const genJs = path.join(__dirname, 'generate.js');
  if (fs.existsSync(genJs)) {
    try {
      const out = execSync(`sudo -n -u www-data ${nodeCmd()} ${genJs}`, { timeout: 120000, encoding: 'utf8' });
      results.push(`静态页+sitemap重建: ${String(out).split('\n').filter(Boolean).join(' | ')}`);
    } catch (e) {
      results.push(`⚠️ 静态页重建失败: ${String(e.message).slice(0, 200)}`);
    }
  }
  const pushScript = path.join(__dirname, 'push_baidu.sh');
  if (fs.existsSync(pushScript)) {
    try {
      const out = execSync(`sudo -n -u www-data bash ${pushScript} new`, { timeout: 60000, encoding: 'utf8' });
      results.push(`百度推送: ${String(out).split('\n').filter(Boolean).pop()}`);
    } catch (e) {
      results.push(`⚠️ 百度推送失败: ${String(e.message).slice(0, 100)}`);
    }
  }
  const indexNowScript = path.join(__dirname, 'push_indexnow.sh');
  if (fs.existsSync(indexNowScript)) {
    try {
      execSync(`sudo -n -u www-data bash ${indexNowScript} new`, { timeout: 60000 });
      results.push('IndexNow 推送已触发');
    } catch (e) {
      results.push(`⚠️ IndexNow 推送失败: ${String(e.message).slice(0, 100)}`);
    }
  }
  return results;
}

// ============ 写入数据库 ============
async function insertCase(pool, oneCase) {
  const [r] = await pool.query(
    `INSERT INTO cases
       (title, client, category, cover_image, description, content, technologies, project_url, sort_order, status, view_count, created_at, updated_at)
     VALUES (?,?,?,'',?,?,?,NULL,0,1,0,NOW(),NOW())`,
    [oneCase.title, oneCase.client, oneCase.category, oneCase.description, oneCase.content, oneCase.technologies]
  );
  return r.insertId;
}

// ============ 主流程 ============
(async () => {
  const mode = (process.argv[2] || 'list').toLowerCase();
  const nowStr = new Date().toLocaleString('zh-CN');

  try {
    const pool = await getPool();

    // 功能 C：列表模式
    if (mode === 'list') {
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM cases WHERE status=1');
      console.log(`当前案例总数: ${total}`);
      pool.end();
      return;
    }

    const [todayRows] = await pool.query("SELECT COUNT(*) AS c FROM cases WHERE DATE(created_at)=CURDATE()");
    const todayCount = todayRows[0].c;

    // 功能 B：每日模式
    if (mode === 'daily') {
      if (todayCount >= 1) {
        console.log(`⏭️ 今天（${new Date().toLocaleDateString('zh-CN')}）已有 ${todayCount} 篇新案例，跳过本次。`);
        pool.end();
        return;
      }
      console.log(`\n=== ${nowStr} 每日案例生成开始 ===`);
      const existingTitles = await loadExistingTitles(pool);
      // 尝试最多 10 个不同槽位，避免标题冲突
      let oneCase = null;
      let usedTopic = null;
      for (let slot = 0; slot < 10; slot++) {
        const topic = pickTopic(slot);
        const variant = generateCaseVariant(topic);
        console.log(`🎯 [槽位 ${slot}] 选题: ${variant.category} / ${variant.industry}（${variant.prompt.slice(0, 40)}...）`);
        try {
          oneCase = await generateOne(pool, variant, slot, existingTitles);
          usedTopic = variant;
          break;
        } catch (e) {
          console.log(`⚠️ 槽位 ${slot} 失败: ${e.message}，尝试下一个...`);
        }
      }
      if (!oneCase) {
        console.error('❌ 连续 10 个槽位均失败，放弃本次生成');
        pool.end();
        process.exit(1);
      }
      console.log('🤖 调用 AI(Ark) 生成案例...');
      const id = await insertCase(pool, oneCase);
      console.log(`✅ 已写入数据库，案例ID: ${id}`);
      console.log(`   - 标题: ${oneCase.title}`);
      console.log(`   - 客户: ${oneCase.client} | 类型: ${oneCase.category}`);
      const post = await regenerateStatic();
      post.forEach(r => console.log(`✅ ${r}`));
      pool.end();
      console.log('🎉 每日案例生成完成');
      return;
    }

    // 功能 A：批量模式
    if (mode === 'batch') {
      const count = Math.max(1, parseInt(process.argv[3], 10) || 30);
      // 可选第 4 参数 startOffset：中断重跑时跳过已生成槽位，避免选题轮换错位
      const startOffset = Math.max(0, parseInt(process.argv[4], 10) || 0);
      console.log(`\n=== ${nowStr} 批量案例生成开始（目标 ${count} 篇${startOffset ? `，起始偏移 ${startOffset}` : ''}）===`);
      const existingTitles = await loadExistingTitles(pool);
      let inserted = 0;
      let failed = 0;
      const industryUseCount = {};
      for (const title of existingTitles) {
        for (const [ind, kws] of Object.entries(INDUSTRY_KW)) {
          if (kws.some(k => String(title).includes(k))) {
            industryUseCount[ind] = (industryUseCount[ind] || 0) + 1;
          }
        }
      }
      const startTime = Date.now();

      for (let i = 0; i < count; i++) {
        const baseTopic = pickBatchTopic(startOffset + i);
        industryUseCount[baseTopic.industry] = (industryUseCount[baseTopic.industry] || 0) + 1;
        const topic = generateCaseVariant(baseTopic);
        console.log(`\n[${i + 1}/${count}] 🎯 选题: ${topic.category} / ${topic.industry}（${topic.prompt}）`);
        try {
          const oneCase = await generateOne(pool, topic, 0, existingTitles);
          const id = await insertCase(pool, oneCase);
          existingTitles.add(oneCase.title);
          inserted++;
          console.log(`✅ 第 ${inserted} 篇入库，案例ID: ${id} | ${oneCase.title}`);
        } catch (e) {
          failed++;
          console.log(`❌ 该主题生成失败（${e.message}），继续下一篇...`);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n📊 批量结果：成功 ${inserted} 篇，失败 ${failed} 篇，耗时 ${elapsed}s`);

      if (inserted === 0) {
        console.error('❌ 本次未生成任何案例，跳过静态重建与推送。');
        pool.end();
        process.exit(1);
      }

      const post = await regenerateStatic();
      post.forEach(r => console.log(`✅ ${r}`));
      pool.end();
      console.log('🎉 批量案例生成完成');
      return;
    }

    console.log(`未知模式: ${mode}（可用: batch N / daily / list）`);
    pool.end();
    process.exit(1);
  } catch (e) {
    console.error('❌ 执行失败：', e.message || e);
    process.exit(1);
  }
})();

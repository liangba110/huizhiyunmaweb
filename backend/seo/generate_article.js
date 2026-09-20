#!/usr/bin/env node
/**
 * 汇智云码科技 - 每日 AI SEO 文章生成器（每天3篇，分时段自动发布）
 * 功能：调用 DeepSeek 生成高质量原创 SEO 文章，写入 articles 数据库，
 *       随后自动重建静态页+sitemap（generate.js），并触发百度推送（push_baidu.sh）
 * 用法：
 *   node generate_article.js 1   # 第1时段（09:00）
 *   node generate_article.js 2   # 第2时段（13:00）
 *   node generate_article.js 3   # 第3时段（17:00）
 * 规则：
 *   - 每天最多发布 3 篇（按数据库当天 published_at 计数，超3篇直接跳过）
 *   - 同一天 3 个时段选题互不重复，相邻日期选题轮换
 *   - 无参数时按当前小时推断时段（9/13/17 点档），其余时间默认第1时段
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const ARK_KEY = process.env.ARK_API_KEY || '';
const ARK_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3') + '/chat/completions';
const ARK_MODEL = process.env.ARK_MODEL || 'ark-code-latest';

// 违禁词过滤模块
let wordFilter = null;
try { wordFilter = require('./word_filter'); } catch (e) { console.log('⚠️ word_filter 模块加载失败:', e.message); }

// ============ 热门 SEO 关键词池（按业务方向分组） ============
// year 字段：标题年份策略
//   'with'    = 标题必须带当前年份（价格/费用类词，用户常搜“2026年XX多少钱”）
//   'without' = 标题不带年份（常青知识类词，带年份反而不自然）
//   'auto'    = AI 按语境自判（流程/技术类，可带可不带）
const TOPICS = [
  {
    category: '行业洞察',
    titleKws: ['小程序开发多少钱', 'APP开发费用', '做一个小程序要多少钱'],
    prompt: '针对「小程序开发价格」写一篇行业洞察类原创文章，聚焦企业主最关心的开发成本问题。',
    year: 'with'
  },
  {
    category: '行业洞察',
    titleKws: ['APP开发流程', 'APP外包注意事项', 'APP开发周期'],
    prompt: '针对「APP定制开发流程与周期」写一篇原创文章，帮企业主了解从需求到上线的完整流程。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['企业网站建设', '企业官网怎么做', '建站方案'],
    prompt: '针对「企业网站建设方案」写一篇技术分享类原创文章，介绍企业官网建设的要点与建站方式。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['小程序开发框架', '微信小程序技术', '小程序开发语言'],
    prompt: '针对「微信小程序开发技术与框架选择」写一篇技术分享类原创文章。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['软件开发公司', '怎么选软件开发公司', '外包开发公司'],
    prompt: '针对「企业如何选择靠谱的软件开发外包公司」写一篇原创文章，提供选型建议。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['网站建设多少钱', '做网站价格', '企业建站费用'],
    prompt: '针对「企业网站建设费用与价格区间」写一篇行业洞察类原创文章。',
    year: 'with'
  },
  {
    category: '技术分享',
    titleKws: ['小程序和APP的区别', '小程序好还是APP好', '三端选型'],
    prompt: '针对「小程序、APP、H5三端如何选型」写一篇原创文章，帮助企业做技术决策。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['数字化转型', '企业数字化', '企业上云'],
    prompt: '针对「企业数字化转型」写一篇行业洞察类原创文章，讲数字化对中小企业的重要性。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['小程序上架', '小程序审核', '小程序备案'],
    prompt: '针对「微信小程序审核/上架/备案注意事项」写一篇原创技术博客。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['API接口开发', '系统集成', 'SaaS系统开发'],
    prompt: '针对「企业SaaS系统/后台管理系统开发」写一篇技术分享类原创文章。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['小程序开发价格明细', '小程序开发费用构成', '微信小程序开发报价'],
    prompt: '针对「小程序开发价格明细与费用构成」写一篇行业洞察类原创文章，给出2026年常见报价区间和影响价格的因素。',
    year: 'with'
  },
  {
    category: '行业洞察',
    titleKws: ['APP开发费用明细', 'APP开发报价表', '做一个APP多少钱'],
    prompt: '针对「APP开发费用明细与报价表」写一篇行业洞察类原创文章，分功能模块拆解费用构成。',
    year: 'with'
  },
  {
    category: '行业洞察',
    titleKws: ['网站建设价格表', '企业建站费用明细', '建站报价'],
    prompt: '针对「企业网站建设价格表与费用明细」写一篇行业洞察类原创文章，按模板站/定制站/SaaS站给出价格区间。',
    year: 'with'
  },
  {
    category: '技术博客',
    titleKws: ['软件开发套餐怎么选', '开发套餐对比', '网站建设套餐'],
    prompt: '针对「软件开发套餐如何选择」写一篇技术博客，教企业主按预算和需求选套餐，避免多花钱。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['小程序开发价格差异', '小程序报价差很多', '小程序开发费用陷阱'],
    prompt: '针对「为什么小程序开发报价差异大」写一篇技术博客，分析低价报价背后的常见套路。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['小程序开发避坑', '小程序开发注意事项', '小程序开发公司套路'],
    prompt: '针对「小程序开发避坑指南」写一篇原创技术博客，列出企业主容易踩的坑和识别方法。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['APP外包开发避坑', 'APP开发公司怎么选', '软件开发外包陷阱'],
    prompt: '针对「APP外包开发避坑」写一篇原创技术博客，讲外包合作中的风险与应对。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['网站建设避坑', '建站公司套路', '网站建设注意事项'],
    prompt: '针对「企业网站建设避坑」写一篇原创技术博客，讲建站过程中的常见问题和应对。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['软件开发合同注意事项', '外包合同避坑', '源码交付合同'],
    prompt: '针对「软件开发合同注意事项」写一篇原创技术博客，讲合同里必须写清楚的关键条款。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['低价小程序开发', '小程序开发低价陷阱', '便宜开发套路'],
    prompt: '针对「低价小程序开发是否靠谱」写一篇原创技术博客，分析低价项目的真实成本与风险。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['软件开发需求文档怎么写', 'PRD怎么写', '开发需求梳理'],
    prompt: '针对「软件开发需求文档怎么写」写一篇原创技术博客，给企业主一份可直接套用的需求梳理模板。',
    year: 'without'
  },
  {
    category: '技术分享',
    titleKws: ['小程序开发流程', '小程序开发步骤', '小程序开发周期'],
    prompt: '针对「小程序开发完整流程与周期」写一篇原创技术分享文章，从需求到上线拆解每个阶段。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['网站建设流程', '企业建站步骤', '网站开发流程'],
    prompt: '针对「企业网站建设流程」写一篇原创技术分享文章，讲建站的完整步骤与每个环节的交付物。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['软件开发项目验收', '项目验收清单', '上线验收标准'],
    prompt: '针对「软件开发项目验收流程与验收清单」写一篇原创技术分享文章。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['APP上架流程', 'APP审核', '应用商店上架'],
    prompt: '针对「APP上架与审核流程」写一篇原创技术分享文章，讲iOS和安卓上架要点。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['餐饮小程序方案', '餐饮点餐小程序', '餐饮数字化'],
    prompt: '针对「餐饮行业小程序解决方案」写一篇行业洞察类原创文章，讲点餐/会员/外卖等功能怎么设计。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['教育机构小程序', '在线课程小程序', '培训机构招生系统'],
    prompt: '针对「教育机构小程序解决方案」写一篇行业洞察类原创文章，讲课程展示/预约/报名/直播等场景。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['诊所预约小程序', '预约挂号系统', '医疗App开发'],
    prompt: '针对「诊所/门诊预约挂号系统解决方案」写一篇行业洞察类原创文章。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['电商小程序商城', '商城小程序开发', '微信商城'],
    prompt: '针对「电商小程序商城解决方案」写一篇行业洞察类原创文章，讲商品/订单/支付/分销等功能。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['美业小程序', '美容院预约小程序', '美容美发系统'],
    prompt: '针对「美容美发门店小程序解决方案」写一篇行业洞察类原创文章，讲预约/会员/员工提成等功能。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['健身私教小程序', '私教预约系统', '健身房系统开发'],
    prompt: '针对「健身私教小程序解决方案」写一篇行业洞察类原创文章，讲课程预约/会员卡/教练管理等。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['宠物店小程序', '宠物洗护预约', '宠物电商小程序'],
    prompt: '针对「宠物店小程序解决方案」写一篇行业洞察类原创文章，讲洗护预约/商城/会员等功能。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['民宿小程序', '酒店预订系统', '房态管理'],
    prompt: '针对「酒店民宿预订系统解决方案」写一篇行业洞察类原创文章，讲房态/预订/OTA对接等。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['同城配送小程序', '跑腿小程序', '外卖小程序开发'],
    prompt: '针对「同城配送/跑腿小程序解决方案」写一篇行业洞察类原创文章。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['制造业官网建设', '工厂网站建设', '工业企业网站'],
    prompt: '针对「制造企业官网建设方案」写一篇技术分享类原创文章，讲产品展示/询盘/多语言等功能。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['房地产小程序', '楼盘展示小程序', '看房系统'],
    prompt: '针对「房地产楼盘小程序解决方案」写一篇行业洞察类原创文章，讲楼盘展示/预约看房/置业顾问等。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['婚庆小程序', '婚纱摄影预约系统', '婚庆行业数字化'],
    prompt: '针对「婚庆摄影小程序解决方案」写一篇行业洞察类原创文章，讲套餐展示/预约/客片管理。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['汽车美容小程序', '4S店小程序', '汽车保养预约'],
    prompt: '针对「汽车服务门店小程序解决方案」写一篇行业洞察类原创文章，讲洗车/保养预约与会员体系。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['家政小程序', '保洁预约', '家政服务系统'],
    prompt: '针对「家政服务小程序解决方案」写一篇行业洞察类原创文章，讲服务下单/阿姨管理/评价体系。',
    year: 'auto'
  },
  {
    category: '行业洞察',
    titleKws: ['青岛小程序开发', '青岛小程序开发公司', '青岛微信小程序'],
    prompt: '针对「青岛小程序开发公司怎么选」写一篇行业洞察类原创文章，结合青岛本地服务场景给出建议。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['青岛网站建设', '青岛建站公司', '青岛做网站'],
    prompt: '针对「青岛网站建设公司」写一篇行业洞察类原创文章，讲本地建站如何选服务商。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['青岛APP开发', '青岛APP外包', '青岛软件开发'],
    prompt: '针对「青岛APP开发公司」写一篇行业洞察类原创文章，讲本地APP开发选型建议。',
    year: 'without'
  },

  // ============ 以下为防飓风算法扩展长尾词（2026-09-03 新增） ============
  {
    category: '行业洞察',
    titleKws: ['小程序开发公司哪家好', '靠谱的小程序开发公司', '小程序外包公司推荐'],
    prompt: '针对「如何选择靠谱的小程序开发公司」写一篇原创文章，从案例、团队、售后三个维度给企业主提供选型参考。',
    year: 'without'
  },
  {
    category: '技术分享',
    titleKws: ['微信支付接入', '小程序支付开发', '微信支付对接流程'],
    prompt: '针对「微信小程序支付功能开发」写一篇技术分享文章，讲支付接入流程、注意事项和常见问题。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['App开发要多久', 'APP开发周期多长', '开发一个App需要多少时间'],
    prompt: '针对「APP开发周期」写一篇原创文章，按功能复杂度拆解时间线，帮企业合理规划排期。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['微信小程序优势', '小程序的好处', '为什么要做小程序'],
    prompt: '针对「企业为什么要做微信小程序」写一篇行业洞察文章，从获客成本、用户习惯、平台生态等角度分析。',
    year: 'without'
  },
  {
    category: '技术分享',
    titleKws: ['企业官网设计', '高端企业网站设计', '品牌官网建设'],
    prompt: '针对「高端品牌官网设计与建设」写一篇技术分享文章，讲视觉设计、用户体验、品牌调性的统一。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['软件开发报价单怎么看', '开发报价明细', 'APP报价包含哪些'],
    prompt: '针对「软件开发报价单怎么读懂」写一篇技术博客，拆解报价单的各组成部分，教企业主识别合理报价。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['同城服务小程序', '本地生活小程序', '到家服务小程序开发'],
    prompt: '针对「本地生活/同城服务小程序解决方案」写一篇行业洞察文章，讲家政、维修、跑腿等场景的数字化方案。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['小程序用户增长', '小程序推广方法', '小程序运营策略'],
    prompt: '针对「小程序上线后的用户增长与运营策略」写一篇技术分享文章，讲裂变、留存、转化的实操方法。',
    year: 'without'
  },
  {
    category: '技术博客',
    titleKws: ['源码交付是什么意思', '源码交付和模板区别', '为什么要源码交付'],
    prompt: '针对「源码交付的重要性」写一篇技术博客，讲源码交付vs模板授权的本质区别，以及对企业长期运营的影响。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['企业数字化转型案例', '传统企业转型数字化', '中小企业数字化方案'],
    prompt: '针对「传统企业数字化转型成功案例」写一篇行业洞察文章，用真实场景讲转型路径和投入产出。',
    year: 'without'
  },
  {
    category: '技术分享',
    titleKws: ['Flutter开发优缺点', 'Flutter和React Native对比', '跨平台框架选型'],
    prompt: '针对「Flutter vs React Native跨平台框架选型」写一篇技术分享文章，从性能、生态、成本等角度对比。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['社区团购小程序', '团长系统开发', '社区电商小程序'],
    prompt: '针对「社区团购小程序解决方案」写一篇行业洞察文章，讲团长管理、拼团、自提等核心功能。',
    year: 'auto'
  },
  {
    category: '技术博客',
    titleKws: ['网站维护费用', '网站续费多少钱', '网站每年要交什么钱'],
    prompt: '针对「网站维护费用与年度续费明细」写一篇技术博客，讲域名、服务器、SSL、维护等年度成本。',
    year: 'with'
  },
  {
    category: '技术分享',
    titleKws: ['Node.js企业级开发', 'Vue3后台管理系统', '全栈开发方案'],
    prompt: '针对「Vue3+Node.js全栈企业级开发实践」写一篇技术分享文章，讲架构设计、技术选型和项目管理。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['直播带货小程序', '直播电商开发', '小程序直播功能'],
    prompt: '针对「直播带货小程序开发方案」写一篇行业洞察文章，讲直播+商城+分销的一体化解决方案。',
    year: 'auto'
  },
  {
    category: '技术博客',
    titleKws: ['小程序和H5哪个好', 'H5和小程序区别', 'H5开发小程序开发对比'],
    prompt: '针对「H5 vs 小程序：企业该选哪个」写一篇技术博客，从开发成本、用户体验、传播渠道等角度对比。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['智慧物业小程序', '小区管理小程序', '物业缴费系统'],
    prompt: '针对「智慧物业小程序解决方案」写一篇行业洞察文章，讲缴费、报修、公告、门禁等场景。',
    year: 'auto'
  },
  {
    category: '技术分享',
    titleKws: ['数据库选型', 'MySQL和MongoDB对比', '企业数据库方案'],
    prompt: '针对「企业级数据库选型：MySQL vs MongoDB vs PostgreSQL」写一篇技术分享文章。',
    year: 'without'
  },
  {
    category: '行业洞察',
    titleKws: ['连锁门店管理系统', '多门店小程序', '连锁品牌数字化'],
    prompt: '针对「连锁门店数字化管理系统方案」写一篇行业洞察文章，讲多店管理、库存调拨、会员通等场景。',
    year: 'auto'
  },
];


// ============ 网站业务背景（让文章贴合真实公司） ============
const COMPANY_BG = `公司背景：汇智云码科技是一家专业软件开发公司，总部位于山东青岛，核心团队来自腾讯、阿里、字节等互联网大厂。
主营业务：
- APP定制开发（iOS/Android/Flutter全平台，已交付60+款上线App）
- 小程序定制开发（微信/支付宝/抖音/百度，已服务50+商家，月活用户超500万）
- 网站/SaaS系统开发（Vue3+Node.js+MySQL全栈，响应式、私有化部署）
- UI/UX设计、运维支持、技术咨询
已服务120+企业客户，交付41+真实案例。`;

// ============ JS 工具 ============
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ============ 时段解析 ============
function resolveSlot() {
  const arg = parseInt(process.argv[2], 10);
  if ([1, 2, 3].includes(arg)) return arg;
  // 无参数时按当前小时推断：9点档=1，13点档=2，17点档=3，其余默认1
  const h = new Date().getHours();
  if (h >= 12 && h < 15) return 2;
  if (h >= 15 && h < 19) return 3;
  return 1;
}

// ============ 选题（同天3个时段互不重复，按天轮换） ============
function pickTopic(slot) {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  // 每天3篇取3个不同主题：index = (dayOffset*3 + slot-1) % TOPICS.length
  const idx = ((dayOfYear * 3 + (slot - 1)) % TOPICS.length + TOPICS.length) % TOPICS.length;
  return TOPICS[idx];
}

// ============ 调用 AI(Ark) 生成文章 ============
async function generateArticle(db, topic) {
  const dateStr = new Date().toLocaleDateString('zh-CN');
  const currentYear = new Date().getFullYear(); // 2026（当前年份，必须正确）

  // 年份策略说明（按关键词流量特性选择性带年份）
  const yearRule = {
    with: `【标题年份策略】本主题标题【必须】包含“${currentYear}年”或“${currentYear}”字样（用户搜索该类关键词时常带年份，如“${currentYear}年XX多少钱”），放在标题前部或中部，自然融入。`,
    without: `【标题年份策略】本主题标题【不得】包含任何年份（“${currentYear}年”、“${currentYear}”等）。这是常青知识类关键词，用户搜索时不带年份，标题带年份反而显得过时、不自然。`,
    auto: `【标题年份策略】本主题标题【由你判断】是否带年份：如果当前内容有时效性（如最新政策、新版本、新价格行情），可自然带上“${currentYear}年”；如果内容是常青知识点，则不帯年份更自然。不要为了带而带。`
  }[topic.year] || `【标题年份策略】由你判断标题是否带年份，自然融入即可。`;

  const system = `你是一位资深的企业软件开发领域撰稿人，为软件开发公司官网写SEO优化文章。
【重要】当前年份是 ${currentYear} 年，所有涉及时间、年份、行业数据、案例时，必须是${currentYear}年或更早的真实表述，绝不使用${currentYear}年以后的年份，也不要使用过时年份（如2025年之前的旧表述除非特指历史）。**正文**中涉及年份时用${currentYear}年表述；**标题**是否带年份按下方年份策略执行。
【⚠️ 合规红线（必须严格遵守，违反即违规）】
1. 严禁使用广告法极限词和绝对化用语：如"国家级、世界级、顶级、最佳、最好、第一、全网最低、最便宜、最低价、史上最低、最强、最先进、100%、百分百、绝对、唯一"等，一律不能用。
2. 不夸大宣传、不虚假承诺：不得宣称"保证赚钱、稳赚、保本、高回报"，不承诺具体投资收益。
3. 严禁任何违法违规内容：不涉及赌博、色情、金融诈骗、代开发票、外挂破解等违法信息。
4. 软件开发行业文章不得出现医疗疗效类表述（如治疗、根治、包治等）。
5. 描述公司实力时用**客观、可验证**的事实（如：已服务120+企业客户、交付41+真实案例），不用"最、第一、顶尖、领先"等无法证实的字眼。
6. 价格、数据必须真实可信，不虚构夸张数据。
7. 文章整体专业、客观、可信，拒绝虚假夸大。
你的写作要求：
1. 文章必须是原创、专业、有深度，**不少于2000字**（正文内容至少2000字，不含HTML标签）。
2. 标题要含${topic.titleKws.join('、')}等热门关键词，并自然不做作。
3. 正文分5-7个小节，每节有小标题（用<h3>包裹），每小节不少于300字。
4. 正文要结合真实行业情况，给到具体数据和实际建议，避免空话套话。必须有具体案例、数据对比、实操建议。
5. 结尾自然融入公司（汇智云码科技）作为案例，但不要生硬广告。
6. 语言专业但不晦涩，面向企业决策者。
7. 文章中必须包含至少一个内链建议（用<a>标签链接到站内相关页面，如/services、/cases、/articles等），增强页面权重传递。
8. 【去AI味·硬性要求，违反视为不合格】
   - 句式长短交错，每段2-4句，段落长度刻意不均；禁止全文段落等长。
   - 禁用模板腔开头/衔接词：首先、其次、再次、最后、总而言之、综上所述、总的来说、值得注意的是、众所周知、随着...的发展、在数字化浪潮下。
   - 每篇至少3处口语化或一线口吻表达，如：说白了、换个角度看、很多老板第一反应是、我们上个月刚交付的项目里、踩过坑的人都懂。
   - 每篇至少1处反问或设问，1处带具体数字的对比（如报价区间、工期天数、失败率）。
   - 小节结构不许雷同：全文中列表、问答体、对比表、叙述段至少出现3种不同形式。
   - 不用"赋能、抓手、闭环、颗粒度、底层逻辑"等黑话。
   - 观点要有倾向性：敢下判断（如"这种报价大概率是模板改皮"），不写四平八稳的"各有优劣"结尾。

${yearRule}

${COMPANY_BG}`;

  const user = `请围绕「${topic.prompt}」写一篇原创SEO文章。
要求：
- 标题：含热门关键词"${topic.titleKws[0]}"，长度≤25字
- 分类：${topic.category}
- 摘要：60-120字，含关键词，概括全文
- 正文：1200-1800字，分4-6个小节（<h3>小标题），段落用<p>
- 输出格式为JSON：{"title":"...","summary":"...","content":"<html内容>"}`;

  // deepseek-flash 为推理模型：偶发返回 HTTP 200 但 message.content 为空
  // （仅返回 reasoning_content，finish_reason=length），直接 JSON.parse('') 会抛
  // "Unexpected end of JSON input"。此处校验空内容，并对同一请求即时重试两次
  // （推理 token 消耗随请求波动，重试通常可恢复），仍失败则交由外层重试机制处理。
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
          temperature: 0.8,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        })
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.log(`⚠️ ${prov.name} API 错误 ${resp.status}: ${err.slice(0,200)}`);
        break; // HTTP错误重试无意义，换下一个模型（外层脚本还有整体重试）
      }

      data = await resp.json();
      const choice = data.choices && data.choices[0];
      const raw = choice && choice.message && choice.message.content;
      if (!raw || typeof raw !== 'string' || !raw.trim()) {
        const reason = (choice && choice.finish_reason) || '无 choices';
        if (reqTry < 3) {
          console.log(`⚠️ ${prov.name} 返回空内容（finish_reason=${reason}），重新请求...`);
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
    throw new Error('AI(Ark)未返回有效内容，已交给外层重试');
  }
  // 解析 JSON（兼容可能的 markdown 包裹）
  let jsonStr = content.replace(/^```json\s*/,'').replace(/```$/,'').trim();
  const article = JSON.parse(jsonStr);

  // 校验
  if (!article.title || !article.summary || !article.content) {
    throw new Error('AI 返回结构不完整: ' + content.slice(0,300));
  }

  return {
    title: article.title,
    category: topic.category,
    summary: article.summary,
    content: article.content,
    author: '汇智云码科技'
  };
}

// ============ 标题查重（防飓风算法：拒绝与已有文章标题重复或高度相似） ============
async function isDuplicateTitle(db, title) {
  // 1. 精确匹配
  const [exact] = await db.query('SELECT id FROM articles WHERE title = ? LIMIT 1', [title]);
  if (exact.length > 0) return { dup: true, reason: '精确重复', matchId: exact[0].id };

  // 2. 去除年份和标点后模糊匹配（防止"2026年XX"和"2025年XX"被判为不同文章）
  const normalized = title.replace(/20\d{2}年?/g, '').replace(/[？！。，、：；""''（）\(\)\-\s]/g, '').trim();
  if (normalized.length >= 4) {
    const [fuzzy] = await db.query(
      "SELECT id, title FROM articles WHERE REPLACE(REPLACE(REPLACE(title, '2026年', ''), '2025年', ''), '2024年', '') LIKE ? LIMIT 1",
      ['%' + normalized + '%']
    );
    if (fuzzy.length > 0) return { dup: true, reason: '标题高度相似', matchId: fuzzy[0].id, matchTitle: fuzzy[0].title };
  }

  return { dup: false };
}

// ============ 内容最低字数校验（防飓风算法：拒绝低质量短内容） ============
function validateContentLength(content, minChars = 800) {
  const textOnly = content.replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim();
  return { ok: textOnly.length >= minChars, charCount: textOnly.length };
}

// ============ 发布后处理：重建静态页+sitemap，再百度推送+IndexNow ============
async function regenerateStatic(db) {
  const { execSync } = require('child_process');
  const results = [];
  // 1) 重建静态页 + sitemap（generate.js 内部连接数据库，写 frontend/dist）
  const genJs = path.join(__dirname, 'generate.js');
  if (fs.existsSync(genJs)) {
    try {
      const out = execSync(`${process.execPath} ${genJs}`, { timeout: 60000, encoding: 'utf8' });
      results.push(`静态页+sitemap重建: ${String(out).split('\n').filter(Boolean).join(' | ')}`);
    } catch (e) {
      results.push(`⚠️ 静态页重建失败: ${String(e.message).slice(0,200)}`);
    }
  }
  // 2) 百度推送
  const pushScript = path.join(__dirname, 'push_baidu.sh');
  if (fs.existsSync(pushScript)) {
    try {
      execSync(`bash ${pushScript}`, { timeout: 30000 });
      results.push('百度推送已触发');
    } catch (e) {
      results.push(`⚠️ 百度推送失败: ${String(e.message).slice(0,100)}`);
    }
  }
  // 3) IndexNow 推送（Bing/Yandex/Naver/Seznam）
  const indexNowScript = path.join(__dirname, 'push_indexnow.sh');
  if (fs.existsSync(indexNowScript)) {
    try {
      execSync(`bash ${indexNowScript} new`, { timeout: 30000 });
      results.push('IndexNow 推送已触发');
    } catch (e) {
      results.push(`⚠️ IndexNow 推送失败: ${String(e.message).slice(0,100)}`);
    }
  }
  return results;
}

// ============ 主流程 ============
(async () => {
  const slot = resolveSlot();
  const nowStr = new Date().toLocaleString('zh-CN');
  console.log(`\n=== ${nowStr} 开始执行（时段 ${slot}）===\n`);
  try {
    const pool = await mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      connectionLimit: 2,
    });

    // 1. 检查今天已发布数量（按数据库当天，最多3篇）
    const [today] = await pool.query(
      "SELECT COUNT(*) AS c FROM articles WHERE DATE(published_at)=CURDATE()"
    );
    const todayCount = today[0].c;
    if (todayCount >= 3) {
      console.log(`⏭️ 今天（${new Date().toLocaleDateString('zh-CN')}）已发布 ${todayCount} 篇（上限3篇），跳过本次。`);
      pool.end();
      return;
    }
    console.log(`📊 今天已发布 ${todayCount}/3 篇，本次将继续生成第 ${todayCount + 1} 篇`);

    // 2. 按时段选题（同天3篇不重复）
    const topic = pickTopic(slot);
    console.log(`🎯 本时段选题（slot=${slot}）: ${topic.category} / ${topic.titleKws[0]}`);

    // 3. 生成文章（含违规词校验+标题查重+内容长度校验，最多重试5次）
    console.log('🤖 调用 AI(Ark) 生成文章...');
    let article = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      article = await generateArticle(pool, topic);

      // 合规校验
      if (wordFilter) {
        const result = wordFilter.validateArticle(article);
        if (!result.ok) {
          console.log(`⚠️ 第${attempt}次生成命中违规词【${result.hits.join('、')}】，重新生成...`);
          article = null;
          continue;
        }
      }

      // 标题查重（防飓风算法）
      const dupCheck = await isDuplicateTitle(pool, article.title);
      if (dupCheck.dup) {
        console.log(`⚠️ 第${attempt}次标题${dupCheck.reason}（匹配ID:${dupCheck.matchId}），重新生成...`);
        article = null;
        continue;
      }

      // 内容长度校验（至少800字纯文本）
      const lenCheck = validateContentLength(article.content, 800);
      if (!lenCheck.ok) {
        console.log(`⚠️ 第${attempt}次内容过短（${lenCheck.charCount}字，要求≥800字），重新生成...`);
        article = null;
        continue;
      }

      console.log(`✅ 第${attempt}次生成通过所有校验（标题无重复，内容${lenCheck.charCount}字）`);
      break;
    }
    if (!article) {
      throw new Error('连续5次生成均未通过校验（违规词/标题重复/内容过短），已停止本次发布');
    }
    console.log(`✅ 生成标题: ${article.title}`);

    // 4. 写入数据库
    const [result] = await pool.query(
      "INSERT INTO articles (title, category, summary, content, author, view_count, status, published_at, created_at, updated_at) VALUES (?,?,?,?,?,0,1,NOW(),NOW(),NOW())",
      [article.title, article.category, article.summary, article.content, article.author]
    );
    const articleId = result.insertId;
    console.log(`✅ 已写入数据库，文章ID: ${articleId}（时段 ${slot}）`);

    // 5. 发布后处理：重建静态页+sitemap + 百度推送
    const postResults = await regenerateStatic(pool);
    postResults.forEach(r => console.log(`✅ ${r}`));

    pool.end();
    console.log('🎉 本时段文章生成发布完成');
  } catch (e) {
    console.error('❌ 生成失败：', e.message || e);
    process.exit(1);
  }
})();

/**
 * 违禁词/违规词过滤模块（广告法 + 违法内容）
 * 用于 AI 生成文章上线前的合规校验，防止出现违规广告词和违禁内容。
 * 采用"精准词组"匹配，避免把"第一次/第一步/第一年/最大商业效果"等正常用法误判为违规。
 */
'use strict';

// 广告法极限词 / 绝对化用语（精准词组，避免误伤）
const AD_BANNED = [
  '国家级', '世界级', '宇宙级', '全球级', '顶级', '顶尖', '极致产品', '极致体验',
  '第一品牌', '世界第一', '全国第一', '全网第一', '销量第一', '排名第一', '行业第一', '中国第一',
];
// 单独处理"最佳/最优/最便宜"等，仅在宣传语境判定（见 checkBannedPHRASE）
const AD_PHRASES = [
  '最佳选择', '最佳方案', '最佳效应', '最佳服务', '最佳产品', '最佳体验', '最佳实践', '最佳性价比',
  '最优解', '最优方案', '最优选择', '最优解方案',
  '最便宜', '最低价', '全网最低', '全网最低价', '最低价格', '史上最低', '历史最低', '超低价', '震撼最低价',
  '最全', '最多用户', '最多选择', '功能最全', '最强', '最先进', '最高端', '最高效', '最专业', '最具性价比',
  '首选品牌', '金牌服务', '王牌产品', '冠军品质', '领导者', '行业领军', '领军企业', '无可替代', '独一无二',
  '绝无仅有', '史无前例', '空前绝后', '世界领先', '国际领先', '遥遥领先', '不可超越', '无法超越',
  '万能', '百分百满意', '100%有效', '百分之百', '保证赚钱', '保赚', '稳赚不赔', '包赚',
  '绝对有效', '保证效果', '一次搞定不再犯', '永久有效',
  '免费赠送', '免费领取', '仅此一天', '最后一天', '限时抢购', '限时秒杀',
];

// 金融/投资类
const FIN_BANNED = [
  '保本', '稳赚', '稳赚不赔', '高回报理财', '投资必赚', '内幕消息', '荐股', '炒股稳赚',
  '日赚', '月入过万', '躺赚', '刷单兼职', '传销', '资金盘', '拉人头',
];

// 医疗健康类（软件开发行业不应出现）
const MED_BANNED = [
  '治疗', '治愈', '康复', '药到病除', '祖传秘方', '偏方', '疗效显著',
  '无副作用', '安全无痛', '保证治愈',
];

// 违法违规/不良内容
const ILLEGAL_BANNED = [
  '赌博', '博彩', '六合彩', '私彩', '网站开发赌博', '色情', '裸聊', '招嫖',
  '诈骗', '洗钱', '外挂', '破解版', '盗版资源', '翻墙软件',
  '代开发票', '办假证', '代孕', '包过', '作弊',
];

// 合并精准词组（注意：AD_BANNED 和 AD_PHRASES 都要进）
const ALL_BANNED = Array.from(new Set([...AD_BANNED, ...AD_PHRASES, ...FIN_BANNED, ...MED_BANNED, ...ILLEGAL_BANNED]));

// 需要精确短语匹配的词（避免"第一""最大""最少"等单字误伤）
const PHRASE_BANNED = ALL_BANNED.filter(w => w.length >= 2 || /最低|最佳|最优/.test(w));

/**
 * 检查文本中的违禁词（短语级精确匹配）
 */
function checkBanned(text) {
  if (!text) return [];
  const lower = String(text);
  const hits = [];
  for (const w of PHRASE_BANNED) {
    if (lower.includes(w)) hits.push(w);
  }
  // 单字敏感词（绝对化但难精确的），仅"第一"在宣传语境才拦，交由专门函数处理
  return Array.from(new Set(hits));
}

/**
 * 检查极限单字词（第一/最X），仅在绝对化宣传语境才判违规
 * @returns {Array} 命中词组
 */
function checkExtremeWords(text) {
  if (!text) return [];
  const t = String(text);
  const hits = [];
  // "第一"：仅当是"宣传性第一"（非时序）
  const firstRe = /(全国|世界|全网|行业|销量|排名|中国|省内|全市)?第一(品牌|名|位置|大|强|好)/;
  if (firstRe.test(t)) hits.push('第一品牌/全国第一等宣传语');
  // "最X"：仅当是明显绝对化宣传
  const extremeRe = /(最便宜|最低价|全网最低|最佳|最优|最全|最强|最先进|最高端|最具|第一品牌)/;
  if (extremeRe.test(t)) {
    const m = t.match(extremeRe);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/**
 * 校验文章是否合规
 * @param {object} article {title, summary, content}
 * @returns {object} {ok, hits, titleHits}
 */
function validateArticle(article) {
  const title = article.title || '';
  const summary = article.summary || '';
  const content = article.content || '';

  // 标题 + 全文短语级匹配
  const titleHits = [...checkBanned(title), ...checkExtremeWords(title)];
  const bodyHits = [...checkBanned(summary + '\n' + content), ...checkExtremeWords(summary + '\n' + content)];

  const finalHits = Array.from(new Set([...titleHits, ...bodyHits]));
  return {
    ok: finalHits.length === 0,
    hits: finalHits,
    titleHits,
  };
}

module.exports = { checkBanned, checkExtremeWords, validateArticle, ALL_BANNED, PHRASE_BANNED };

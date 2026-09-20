#!/usr/bin/env node
/**
 * 汇智云码 百度普通收录 - 全站排队推送脚本
 * 背景：全站 63 条 URL 从未批量推过百度（此前只有每天增量 1-3 条），老文章收录机会低。
 * 本脚本每天固定最多推 6 条（与增量推送 ≤3 条/天错开，合计 ≤9 < 百度免费配额 ~10 条/天），
 * 按文章 ID 从大到小（最新优先）排队，状态文件记录已推 URL，直至全站推完。
 *
 * 状态文件：/data/web/huizhiyunma/backend/seo/.push_all_state.json
 *   { "pushed": [url,...], "updated": "YYYY-MM-DD" }
 *   - 2026-08-19 增量已推的 45/44/43 已在首次初始化时标记为已推，避免重复消耗配额。
 * 日志：/data/web/huizhiyunma/backend/seo/push_all.log
 * 用法：/home/ubuntu/.nvm/versions/node/v22.23.0/bin/node /data/web/huizhiyunma/backend/seo/push-all-queue.mjs
 */
import fs from 'fs';
import http from 'http';

// ---------- 绝对路径与常量 ----------
const SITEMAP = '/data/web/huizhiyunma/frontend/dist/sitemap.xml';
const STATE_FILE = '/data/web/huizhiyunma/backend/seo/.push_all_state.json';
const LOG_FILE = '/data/web/huizhiyunma/backend/seo/push_all.log';
const LOG_BAIDU = '/data/web/huizhiyunma/backend/seo/push_baidu.log';
const SITE = 'https://openai2000.cn';
// 【安全】百度推送 token 不硬编码：优先环境变量，其次读 backend/.env
const BAIDU_TOKEN = (() => {
  if (process.env.BAIDU_TOKEN) return process.env.BAIDU_TOKEN;
  try {
    const m = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^BAIDU_TOKEN=(.*)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
})();
const PUSH_API = `http://data.zz.baidu.com/urls?site=${SITE}&token=${BAIDU_TOKEN}`;
const DAILY_LIMIT = 6; // 固定每天最多 6 条，与增量推送错开，不超百度免费配额

// 2026-08-19 当天增量已推的文章（45/44/43），首次初始化状态文件时标记为已推
const ALREADY_PUSHED_0819 = [
  `${SITE}/articles/45`,
  `${SITE}/articles/44`,
  `${SITE}/articles/43`,
];

// ---------- 工具函数 ----------
function log(msg) {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  const line = `${ts} ${msg}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function localToday() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function readState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Array.isArray(s.pushed)) return s;
    } catch (e) {
      log(`⚠️ 状态文件解析失败，重建：${e.message}`);
    }
  }
  // 首次运行：把 8/19 增量已推的 45/44/43 标记为已推，全站队列从 42 开始
  return { pushed: ALREADY_PUSHED_0819.slice(), updated: '2026-08-19' };
}

function writeState(state) {
  state.updated = localToday();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function readSitemapUrls() {
  if (!fs.existsSync(SITEMAP)) {
    throw new Error(`sitemap 不存在: ${SITEMAP}`);
  }
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  return [...new Set(urls)].filter(u => /^https:\/\/([a-z0-9-]+\.)?openai2000\.cn\//.test(u));
}

// 排队顺序：文章按 ID 从大到小（最新优先）→ 案例按 ID 从大到小 → 静态页（首页/栏目页已持续被抓，放最后）
function buildQueue(urls, pushedSet) {
  const articles = [];
  const cases = [];
  const cityHomes = [];
  const statics = [];
  for (const u of urls) {
    if (pushedSet.has(u)) continue;
    const am = u.match(/\/articles\/(\d+)$/);
    const cm = u.match(/\/cases\/(\d+)$/);
    const ch = u.match(/^https:\/\/([a-z0-9-]+)\.openai2000\.cn\/$/);
    if (am) articles.push({ u, id: parseInt(am[1], 10) });
    else if (cm) cases.push({ u, id: parseInt(cm[1], 10) });
    else if (ch && ch[1] !== 'www') cityHomes.push(u);
    else statics.push(u);
  }
  articles.sort((a, b) => b.id - a.id);
  cases.sort((a, b) => b.id - a.id);
  cityHomes.sort();
  return articles.map(x => x.u).concat(cases.map(x => x.u)).concat(cityHomes).concat(statics);
}

// 当天已推条数：push_all.log 与 push_baidu.log 当天 "success":N 之和，作为当日已消耗配额
function lineStartsToday(line) {
  const m = line.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!m) return false;
  const p = n => String(parseInt(n, 10)).padStart(2, '0');
  return `${m[1]}-${p(m[2])}-${p(m[3])}` === localToday();
}

// push_all.log：每行以 "YYYY-MM-DD HH:MM:SS" 开头，直接按行首日期统计当天的 success
function pushAllTodayPushed() {
  if (!fs.existsSync(LOG_FILE)) return 0;
  let count = 0;
  const raw = fs.readFileSync(LOG_FILE, 'utf8');
  for (const line of raw.split('\n')) {
    if (!lineStartsToday(line)) continue;
    const m = line.match(/"success"\s*:\s*(\d+)/);
    if (m) count += parseInt(m[1], 10);
  }
  return count;
}

// push_baidu.log：以 "=== YYYY-MM-DD HH:MM:SS 开始推送 ===" 分段，
// 只累计当天各段内出现的 "success":N
function pushBaiduTodayPushed() {
  if (!fs.existsSync(LOG_BAIDU)) return 0;
  let count = 0;
  let segDay = '';
  for (const line of fs.readFileSync(LOG_BAIDU, 'utf8').split('\n')) {
    const m = line.match(/^===\s*(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (m) {
      const p = n => String(parseInt(n, 10)).padStart(2, '0');
      segDay = `${m[1]}-${p(m[2])}-${p(m[3])}`;
      continue;
    }
    if (segDay !== localToday()) continue;
    const s = line.match(/"success"\s*:\s*(\d+)/);
    if (s) count += parseInt(s[1], 10);
  }
  return count;
}

function todayPushedCount() {
  return pushAllTodayPushed() + pushBaiduTodayPushed();
}

function postUrls(batch) {
  return new Promise((resolve, reject) => {
    const u = new URL(PUSH_API);
    const body = batch.join('\n');
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { /* 非 JSON，按错误处理 */ }
        resolve({ status: res.statusCode, body: data, parsed });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('请求超时')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------- 主流程 ----------
(async () => {
  try {
    const today = localToday();
    const state = readState();
    const pushedSet = new Set(state.pushed);

    const usedToday = todayPushedCount();
    const remainLimit = DAILY_LIMIT - usedToday;
    if (remainLimit <= 0) {
      log(`=== 今日已推满限额（${usedToday}/${DAILY_LIMIT}），退出 ===`);
      return;
    }

    const urls = readSitemapUrls();
    const queue = buildQueue(urls, pushedSet);
    if (queue.length === 0) {
      log(`=== 全站 URL 已全部推送完成（共 ${urls.length} 条），退出 ===`);
      return;
    }

    const batch = queue.slice(0, remainLimit);
    log(`=== ${today} 开始全站排队推送 ===`);
    log(`sitemap URL 总数: ${urls.length}；已推: ${pushedSet.size}；待推: ${queue.length}；今日已推: ${usedToday}；本批: ${batch.length} 条`);

    const result = await postUrls(batch);
    log(`推送结果(HTTP ${result.status}): ${result.body}`);

    const parsed = result.parsed;
    if (parsed && typeof parsed.success === 'number' && parsed.success > 0) {
      // 成功则写入状态文件（含本批全部 URL），防止重推
      state.pushed = [...pushedSet, ...batch];
      writeState(state);
      log(`✅ 百度全站推送成功：本批 ${parsed.success} 条，剩余配额 ${typeof parsed.remain === 'number' ? parsed.remain : '?'}；状态文件已更新（累计已推 ${state.pushed.length} 条）`);
      return;
    }

    const msg = parsed && parsed.message ? parsed.message : `HTTP ${result.status} ${result.body.slice(0, 200)}`;
    log(`⚠️ 百度全站推送失败（未消耗配额）：${msg}，本批保留待下轮重试`);
    process.exitCode = 1;
  } catch (e) {
    log(`❌ 全站推送异常：${e.stack || e.message}`);
    process.exitCode = 1;
  }
})();

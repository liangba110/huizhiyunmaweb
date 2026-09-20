require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARK_KEY = process.env.ARK_API_KEY || '';
const ARK_URL = (process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3') + '/chat/completions';
const ARK_MODEL = process.env.ARK_MODEL || 'ark-code-latest';
const STATE_FILE = path.join(__dirname, 'rewrite-state.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SYSTEM = `你是一位资深的企业软件开发领域撰稿人。任务：重写给定文章正文，去除AI痕迹，保留SEO价值。
【去AI味·硬性要求】
1. 句式长短交错，每段2-4句，段落长度刻意不均。
2. 禁用模板腔：首先、其次、再次、最后、总而言之、综上所述、总的来说、值得注意的是、众所周知、随着...的发展、在数字化浪潮下。
3. 每篇至少3处口语化/一线口吻表达（说白了、换个角度看、很多老板第一反应是、我们上个月刚交付的项目里、踩过坑的人都懂）。
4. 至少1处反问或设问，至少2处带具体数字的对比。
5. 小节结构多样化：列表、问答体、对比、叙述段至少3种形式。
6. 禁用黑话：赋能、抓手、闭环、颗粒度、底层逻辑。
7. 观点有倾向性，敢下判断，不写四平八稳的"各有优劣"结尾。
【保留要求】
1. 保留全部<h2>/<h3>小节结构和数量（可微调措辞）。
2. 保留全部站内<a>内链及其href。
3. 保留文中所有具体价格、数据、年份事实（年份保持2026或更早）。
4. 正文长度不低于原文的85%。
5. 只输出重写后的HTML正文，不要输出任何解释、不要markdown代码块标记。`;

async function callLLM(content, tryN) {
  const resp = await fetch(ARK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ARK_KEY },
    body: JSON.stringify({
      model: ARK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: '请重写下面这篇文章正文：\n\n' + content }
      ],
      temperature: 0.85,
      max_tokens: 8000
    })
  });
  const data = await resp.json();
  const out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
  const clean = out.replace(/^```(html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return clean;
}

function rebuild() {
  try {
    const out = execSync(process.execPath + ' ' + path.join(__dirname, 'generate.js'), { timeout: 120000, encoding: 'utf8' });
    console.log('✅ 静态页重建完成:', (String(out).match(/sitemap URL：(\d+)/) || [''])[0]);
    execSync('chown -R ubuntu:www-data /data/web/huizhiyunma/frontend/dist');
  } catch (e) { console.log('⚠️ 重建失败:', String(e.message).slice(0, 120)); }
}

(async () => {
  if (!ARK_KEY) { console.log('❌ ARK_API_KEY 未配置'); process.exit(1); }
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: +process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [rows] = await conn.query('SELECT id, title, summary, content FROM articles ORDER BY id ASC');
  const done = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { ids: [] };
  const todo = rows.filter(r => !done.ids.includes(r.id));
  console.log(`== 批量去AI味重写启动 == 总${rows.length}篇, 已完成${done.ids.length}, 待处理${todo.length}`);
  let ok = 0, fail = 0;
  for (const a of todo) {
    const origLen = String(a.content || '').replace(/<[^>]+>/g, '').length;
    let success = false;
    for (let t = 1; t <= 2 && !success; t++) {
      try {
        console.log(`[${new Date().toISOString()}] 文章${a.id}《${a.title}》第${t}次尝试 (原文${origLen}字)...`);
        const rewritten = await callLLM(a.content, t);
        const newLen = rewritten.replace(/<[^>]+>/g, '').length;
        const hCount = (rewritten.match(/<h[23][^>]*>/g) || []).length;
        const origH = (String(a.content || '').match(/<h[23][^>]*>/g) || []).length;
        if (!rewritten || newLen < origLen * 0.6 || newLen < 800) { console.log(`  ⚠️ 长度不足(${newLen}字), 重试或跳过`); continue; }
        if (hCount < origH) { console.log(`  ⚠️ 小节数变少(${hCount}/${origH}), 重试或跳过`); continue; }
        await conn.query('UPDATE articles SET content = ? WHERE id = ?', [rewritten, a.id]);
        done.ids.push(a.id);
        fs.writeFileSync(STATE_FILE, JSON.stringify(done));
        ok++; success = true;
        console.log(`  ✅ 完成 ${newLen}字, h=${hCount}, 累计${ok}`);
      } catch (e) { console.log(`  ❌ 异常: ${String(e.message).slice(0, 100)}`); }
    }
    if (!success) { fail++; console.log(`  ⏭️ 跳过文章${a.id}`); }
    await sleep(4000);
    if (ok > 0 && ok % 10 === 0) rebuild();
  }
  rebuild();
  await conn.end();
  console.log(`== 全部结束 == 成功${ok}, 失败${fail}`);
})();

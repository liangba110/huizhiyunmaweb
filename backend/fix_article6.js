require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');

async function callDeepSeek(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'ark-code-latest',
      messages: [
        {role: 'system', content: '你是资深中文技术内容专家。必须生成2000字以上的专业文章，包含完整的H2/H3结构。'},
        {role: 'user', content: prompt}
      ],
      max_tokens: 8000,
      temperature: 0.7
    });
    
    const options = {
      hostname: 'ark.cn-beijing.volces.com',
      port: 443,
      path: '/api/coding/v3/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(d);
          resolve(p.choices[0].message.content);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  const envContent = fs.readFileSync('/data/web/huizhiyunma/backend/.env', 'utf8');
  const apiKey = envContent.match(/ARK_API_KEY=(.+)/)?.[1]?.trim();
  
  console.log('API Key长度:', apiKey?.length);
  
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'huizhiyunma',
    password: process.env.DB_PASSWORD,
    database: 'huizhiyunma_db'
  });
  
  const prompt = `写一篇2000字以上的专业文章：

标题：外包 vs 自建团队：企业 App 开发的 5 个关键决策点
分类：行业洞察

要求：
1. 必须包含5个H2标题，每个H2下至少1个H3
2. 总字数必须超过2000字
3. 每个章节至少200字
4. 包含具体数据、案例、建议
5. 在适当位置加入内链：/services、/cases

输出纯HTML，从<h2>开始，不要<html><body>。

结构：
- H2: 引言（200字）
- H2: 决策点一：成本与预算（300字，含H3）
- H2: 决策点二：技术能力（300字，含H3）
- H2: 决策点三：项目周期（300字，含H3）
- H2: 决策点四：质量控制（300字，含H3）
- H2: 决策点五：长期维护（300字，含H3）
- H2: 总结与建议（200字）`;

  console.log('正在调用DeepSeek API...');
  const content = await callDeepSeek(prompt, apiKey);
  
  const withLinks = content
    .replace(/<h2/g, '<p><a href="/services">了解我们的App开发服务</a></p><h2')
    + '<p>查看<a href="/cases">成功案例</a>了解更多实践经验。</p>';
  
  await db.execute('UPDATE articles SET content=?, updated_at=NOW() WHERE id=6', [withLinks]);
  
  const textOnly = content.replace(/<[^>]*>/g, '');
  console.log('文章6重写完成：');
  console.log('  字数:', textOnly.length);
  console.log('  H2:', (content.match(/<h2/g)||[]).length);
  console.log('  H3:', (content.match(/<h3/g)||[]).length);
  
  await db.end();
})().catch(e => console.error('错误:', e.message));

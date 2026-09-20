require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');

async function callDeepSeek(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'ark-code-latest',
      messages: [
        {role: 'system', content: '你是资深中文技术内容专家。必须生成2000字以上的专业文章，包含完整的H2/H3结构。输出纯HTML，从<h2>开始。'},
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
        'Authorization': '***' + apiKey,
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

function addInternalLinks(content, category) {
  const serviceLinks = {
    '技术博客': '/services',
    '行业洞察': '/services',
    '开发指南': '/services',
    '案例分析': '/cases',
    '技术前沿': '/services'
  };
  
  const caseLinks = {
    '技术博客': '/cases/1',
    '行业洞察': '/cases/2',
    '开发指南': '/cases/3',
    '案例分析': '/cases/4',
    '技术前沿': '/cases/5'
  };
  
  let optimized = content;
  
  const firstH2Index = optimized.indexOf('<h2');
  if (firstH2Index !== -1) {
    const linkHtml = `<p><a href="${serviceLinks[category] || '/services'}">了解我们的${category}服务</a></p>`;
    optimized = optimized.slice(0, firstH2Index) + linkHtml + optimized.slice(firstH2Index);
  }
  
  optimized += `<p><a href="${caseLinks[category] || '/cases'}">查看${category}成功案例</a></p>`;
  
  return optimized;
}

(async () => {
  const envContent = fs.readFileSync('/data/web/huizhiyunma/backend/.env', 'utf8');
  const apiKeyMatch = envContent.match(/ARK_API_KEY=(.+)/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
  
  if (!apiKey) {
    console.error('未找到ARK_API_KEY');
    process.exit(1);
  }
  
  console.log('API Key长度:', apiKey.length);
  
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'huizhiyunma',
    password: process.env.DB_PASSWORD,
    database: 'huizhiyunma_db'
  });
  
  const [articles] = await db.execute(
    'SELECT id, title, category, LENGTH(content) as len FROM articles WHERE LENGTH(content) < 100 ORDER BY id'
  );
  
  console.log(`待修复0字文章: ${articles.length}篇`);
  
  for (const article of articles) {
    console.log(`\n开始修复文章 ${article.id}: ${article.title}`);
    
    const prompt = `写一篇2000字以上的专业文章：

标题：${article.title}
分类：${article.category}

要求：
1. 必须包含4-6个H2标题，每个H2下至少1-2个H3
2. 总字数必须超过2000字
3. 每个章节200-400字
4. 包含具体数据、案例、建议
5. 解决读者实际问题，避免空洞营销话术

结构：
- H2: 引言/背景（200字）
- H2: 核心概念/原理（300字，含H3）
- H2: 详细分析/方案（400字，含2-3个H3）
- H2: 实施步骤/操作指南（300字，含H3）
- H2: 常见问题/注意事项（300字，含H3）
- H2: 总结与建议（200字）`;

    try {
      const content = await callDeepSeek(prompt, apiKey);
      const withLinks = addInternalLinks(content, article.category);
      
      await db.execute('UPDATE articles SET content=?, updated_at=NOW() WHERE id=?', [withLinks, article.id]);
      
      const textOnly = content.replace(/<[^>]*>/g, '');
      console.log(`文章 ${article.id} 修复完成:`);
      console.log(`  字数: ${textOnly.length}`);
      console.log(`  H2: ${(content.match(/<h2/g)||[]).length}`);
      console.log(`  H3: ${(content.match(/<h3/g)||[]).length}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`文章 ${article.id} 修复失败:`, error.message);
    }
  }
  
  console.log('\n=== 0字文章修复完成 ===');
  
  await db.end();
})().catch(e => console.error('错误:', e.message));

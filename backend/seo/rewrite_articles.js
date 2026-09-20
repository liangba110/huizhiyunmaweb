const mysql = require('mysql2/promise');
const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_MODEL = process.env.ARK_MODEL || 'ark-code-latest';

function generatePrompt(title, category) {
  return `你是一位资深的中文技术内容专家和SEO优化师。请为以下文章生成高质量、SEO友好的内容。

文章标题：${title}
文章分类：${category}

## 内容要求

1. **字数**：2000-2500字（纯文本，不含HTML标签）
2. **结构**：
   - H1：文章标题（已提供）
   - H2：3-5个主要章节
   - H3：2-4个子章节（在H2下）
   - 每个章节150-300字

3. **内容质量**：
   - 原创、专业、有深度
   - 包含具体数据、案例、建议
   - 解决读者实际问题
   - 避免空洞的营销话术

4. **SEO优化**：
   - 关键词自然分布（密度1-3%）
   - 首段包含主关键词
   - 使用相关长尾词
   - 内容结构清晰

5. **内链建议**：
   - 在适当位置提及"小程序开发"、"App开发"、"网站建设"等服务
   - 建议链接到相关案例或服务页

## 输出格式

请直接输出HTML格式的内容，包含以下标签：
- <h2> 章节标题
- <h3> 子章节标题
- <p> 段落内容
- <ul>/<li> 列表项
- <strong> 重点内容

不要包含 <html>、<body>、<h1> 标签，直接从 <h2> 开始。

## 内容大纲建议

请根据标题"${title}"，生成以下结构的内容：

1. 引言/背景介绍（H2）
   - 问题/需求引入
   - 文章价值说明

2. 核心概念/原理（H2）
   - 定义解释
   - 技术原理
   - 行业现状

3. 详细分析/方案（H2，包含2-3个H3）
   - 方案一：详细说明+案例
   - 方案二：详细说明+案例
   - 方案三：详细说明+案例

4. 实施步骤/操作指南（H2）
   - 步骤1：详细说明
   - 步骤2：详细说明
   - 步骤3：详细说明

5. 常见问题/注意事项（H2）
   - 问题1：解答
   - 问题2：解答
   - 问题3：解答

6. 总结与建议（H2）
   - 核心要点回顾
   - 行动建议
   - 相关资源推荐

请开始生成内容：`;
}

async function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: ARK_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一位资深的中文技术内容专家，擅长撰写高质量、SEO友好的技术文章。你的内容专业、深入、实用，能够帮助读者解决实际问题。'
        },
        {
          role: 'user',
          content: prompt
        }
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
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.choices && parsed.choices[0]) {
            resolve(parsed.choices[0].message.content);
          } else {
            reject(new Error('Invalid response from Ark API'));
          }
        } catch (e) { reject(e); }
      });
    });

    req.on('error', (e) => { reject(e); });
    req.write(data);
    req.end();
  });
}

function addInternalLinks(content, articleId, category) {
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
    const insertPoint = optimized.indexOf('>', firstH2Index) + 1;
    const linkHtml = `<p>如果您需要专业的${category}服务，欢迎了解我们的<a href="${serviceLinks[category] || '/services'}">${category}解决方案</a>。</p>`;
    optimized = optimized.slice(0, insertPoint) + linkHtml + optimized.slice(insertPoint);
  }
  
  const middleIndex = Math.floor(optimized.length / 2);
  const caseLinkHtml = `<p>查看我们的<a href="${caseLinks[category] || '/cases'}">成功案例</a>了解更多${category}实践经验。</p>`;
  optimized = optimized.slice(0, middleIndex) + caseLinkHtml + optimized.slice(middleIndex);
  
  const articleLink = `/articles/${articleId + 1}`;
  const articleLinkHtml = `<p>相关阅读：<a href="${articleLink}">了解更多${category}相关内容</a></p>`;
  optimized = optimized + articleLinkHtml;
  
  return optimized;
}

function calculateScore(content) {
  let score = 0;
  const textOnly = content.replace(/<[^>]*>/g, '');
  const wordCount = textOnly.length;
  
  if (wordCount >= 2000) score += 30;
  else if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 10;
  
  const h2Count = (content.match(/<h2/g) || []).length;
  const h3Count = (content.match(/<h3/g) || []).length;
  if (h2Count >= 3 && h3Count >= 2) score += 20;
  else if (h2Count >= 2) score += 10;
  
  const internalLinks = (content.match(/href=\"\//g) || []).length;
  if (internalLinks >= 3) score += 20;
  else if (internalLinks >= 1) score += 10;
  
  const pCount = (content.match(/<p/g) || []).length;
  if (pCount >= 5) score += 15;
  else if (pCount >= 3) score += 10;
  
  return { score, wordCount, h2Count, h3Count, internalLinks, pCount };
}

async function rewriteArticle(db, article) {
  const { id, title, category, content: oldContent } = article;
  
  console.log(`\n开始重写文章 ${id}: ${title}`);
  
  try {
    const prompt = generatePrompt(title, category);
    const newContent = await callDeepSeek(prompt);
    const optimizedContent = addInternalLinks(newContent, id, category);
    
    const oldScore = calculateScore(oldContent);
    const newScore = calculateScore(optimizedContent);
    
    await db.execute(
      'UPDATE articles SET content = ?, updated_at = NOW() WHERE id = ?',
      [optimizedContent, id]
    );
    
    console.log(`文章 ${id} 重写完成:`);
    console.log(`  旧分数: ${oldScore.score} (${oldScore.wordCount}字)`);
    console.log(`  新分数: ${newScore.score} (${newScore.wordCount}字)`);
    console.log(`  H2: ${newScore.h2Count}, H3: ${newScore.h3Count}, 内链: ${newScore.internalLinks}`);
    
    return { id, title, oldScore: oldScore.score, newScore: newScore.score, success: true };
  } catch (error) {
    console.error(`文章 ${id} 重写失败:`, error.message);
    return { id, title, success: false, error: error.message };
  }
}

async function main() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'huizhiyunma',
    password: process.env.DB_PASSWORD,
    database: 'huizhiyunma_db'
  });
  
  console.log('=== DeepSeek 文章重写（Surfer SEO优化）===');
  
  const [articles] = await db.execute(
    'SELECT id, title, category, content FROM articles WHERE id IN (3, 4, 5, 6) ORDER BY id'
  );
  
  console.log(`待重写文章: ${articles.length}篇`);
  
  const results = [];
  
  for (const article of articles) {
    const result = await rewriteArticle(db, article);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const avgScoreImprovement = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.newScore - r.oldScore), 0) / successCount;
  
  console.log('\n=== 重写完成 ===');
  console.log(`成功: ${successCount}篇`);
  console.log(`失败: ${failCount}篇`);
  console.log(`平均分数提升: ${avgScoreImprovement.toFixed(1)}`);
  
  await db.end();
}

main().catch(console.error);

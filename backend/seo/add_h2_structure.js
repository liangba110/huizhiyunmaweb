const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_API_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions';

// 服务页面映射
const SERVICE_LINKS = {
  '技术博客': '/services',
  '行业洞察': '/services',
  '开发指南': '/services',
  '案例分析': '/cases'
};

// 案例页面映射
const CASE_LINKS = {
  '技术博客': '/cases/1',
  '行业洞察': '/cases/2',
  '开发指南': '/cases/3',
  '案例分析': '/cases/4'
};

// 添加内部链接
function addInternalLinks(content, category) {
  const serviceLink = SERVICE_LINKS[category] || '/services';
  const caseLink = CASE_LINKS[category] || '/cases';
  
  // 在第一个H2后添加服务链接
  let modified = content.replace(
    /(<h2[^>]*>)/,
    `$1\n<p>如果您需要专业的开发服务，欢迎了解<a href="${serviceLink}">我们的服务</a>。</p>`
  );
  
  // 在中间添加案例链接
  const midPoint = Math.floor(content.length / 2);
  const beforeMid = content.substring(0, midPoint);
  const afterMid = content.substring(midPoint);
  modified = beforeMid + 
    `\n<p>查看<a href="${caseLink}">成功案例</a>了解更多。</p>\n` + 
    afterMid;
  
  // 在结尾添加相关文章链接
  modified += '\n<p>更多相关内容，请访问<a href="/articles">文章中心</a>。</p>';
  
  return modified;
}

// 调用AI(Ark)重写文章
async function rewriteArticle(title, content) {
  return new Promise((resolve, reject) => {
    const prompt = `请将以下文章重写，添加完整的H2/H3结构，确保：
1. 保留文章核心主题和主要观点
2. 添加5-6个H2标题，每个H2下有2-3个H3子标题
3. 每个章节至少300字
4. 总字数≥2000字
5. 使用中文，专业但易懂
6. 输出纯HTML，从<h2>开始

文章标题：${title}

原文内容：
${content.substring(0, 2000)}

请输出重写后的完整HTML内容：`;

    const postData = JSON.stringify({
      model: 'ark-code-latest',
      messages: [
        { role: 'system', content: '你是资深中文技术内容专家。必须生成2000字以上的专业文章，包含完整的H2/H3结构。输出纯HTML，从<h2>开始。' },
        { role: 'user', content: prompt }
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
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0] && response.choices[0].message) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error('Invalid API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 检查文章是否有H2结构
function hasH2Structure(content) {
  return content.includes('<h2') && (content.match(/<h2/g) || []).length >= 3;
}

// 主函数
async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    // 获取没有H2结构的文章
    const [articles] = await connection.query(`
      SELECT id, title, content, category 
      FROM articles 
      WHERE status = 1 
      AND (LENGTH(content) - LENGTH(REPLACE(content, '<h2', ''))) / 3 < 3
      ORDER BY id ASC
    `);
    
    console.log(`找到 ${articles.length} 篇需要添加H2结构的文章`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    for (const article of articles) {
      processed++;
      console.log(`\n处理文章 ${processed}/${articles.length}: ${article.title}`);
      
      try {
        // 检查是否已经有H2结构
        if (hasH2Structure(article.content)) {
          console.log('  ✓ 已有H2结构，跳过');
          continue;
        }
        
        // 调用API重写文章
        console.log('  → 调用AI(Ark)重写...');
        const newContent = await rewriteArticle(article.title, article.content);
        
        // 检查返回内容质量
        const wordCount = newContent.replace(/<[^>]*>/g, '').length;
        const h2Count = (newContent.match(/<h2/g) || []).length;
        
        if (wordCount < 1000 || h2Count < 3) {
          console.log(`  ⚠️ 质量不足: ${wordCount}字, ${h2Count}个H2`);
          failed++;
          continue;
        }
        
        // 添加内部链接
        const category = article.category || '技术博客';
        const finalContent = addInternalLinks(newContent, category);
        
        // 更新数据库
        await connection.query(
          'UPDATE articles SET content = ? WHERE id = ?',
          [finalContent, article.id]
        );
        
        console.log(`  ✅ 成功: ${wordCount}字, ${h2Count}个H2`);
        success++;
        
        // 避免API限流，等待1秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ❌ 失败: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n=== 完成 ===`);
    console.log(`总计: ${articles.length}篇`);
    console.log(`成功: ${success}篇`);
    console.log(`失败: ${failed}篇`);
    console.log(`跳过: ${articles.length - success - failed}篇`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);

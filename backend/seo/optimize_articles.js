require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');

// Surfer SEO 评分函数
function calculateSurferScore(article) {
  let score = 0;
  const content = article.content || '';
  const textOnly = content.replace(/<[^>]*>/g, '');
  const wordCount = textOnly.length;
  
  // 1. 字数评分 (0-30分)
  if (wordCount >= 2000) score += 30;
  else if (wordCount >= 1500) score += 20;
  else if (wordCount >= 1000) score += 10;
  else score += 0;
  
  // 2. 标题结构 (0-20分)
  const h2Count = (content.match(/<h2/g) || []).length;
  const h3Count = (content.match(/<h3/g) || []).length;
  if (h2Count >= 3 && h3Count >= 2) score += 20;
  else if (h2Count >= 2) score += 10;
  else score += 0;
  
  // 3. 内链检测 (0-20分)
  const internalLinks = (content.match(/href=\"\//g) || []).length;
  if (internalLinks >= 3) score += 20;
  else if (internalLinks >= 1) score += 10;
  else score += 0;
  
  // 4. 图片优化 (0-15分)
  const imgCount = (content.match(/<img/g) || []).length;
  const altCount = (content.match(/alt=\"/g) || []).length;
  if (imgCount >= 2 && altCount >= 2) score += 15;
  else if (imgCount >= 1) score += 5;
  else score += 0;
  
  // 5. 段落结构 (0-15分)
  const pCount = (content.match(/<p/g) || []).length;
  if (pCount >= 5) score += 15;
  else if (pCount >= 3) score += 10;
  else score += 0;
  
  return { score, wordCount, h2Count, h3Count, internalLinks, imgCount, pCount };
}

// 添加内链到文章
function addInternalLinks(content, articleId, category) {
  // 相关服务链接
  const serviceLinks = {
    '开发指南': '/services',
    '行业方案': '/services',
    '技术前沿': '/services',
    '运营实战': '/services',
    'AI赋能': '/services'
  };
  
  // 相关案例链接
  const caseLinks = {
    '开发指南': '/cases/1',
    '行业方案': '/cases/2',
    '技术前沿': '/cases/3',
    '运营实战': '/cases/4',
    'AI赋能': '/cases/5'
  };
  
  // 相关文章链接（动态生成）
  const articleLink = `/articles/${articleId + 1}`;
  
  // 在适当位置插入内链
  let optimized = content;
  
  // 1. 在第一个H2后插入服务链接
  const firstH2Index = optimized.indexOf('<h2');
  if (firstH2Index !== -1) {
    const insertPoint = optimized.indexOf('>', firstH2Index) + 1;
    const linkHtml = `<p>如果您需要专业的${category}服务，欢迎了解我们的<a href="${serviceLinks[category] || '/services'}">${category}解决方案</a>。</p>`;
    optimized = optimized.slice(0, insertPoint) + linkHtml + optimized.slice(insertPoint);
  }
  
  // 2. 在中间插入案例链接
  const middleIndex = Math.floor(optimized.length / 2);
  const caseLinkHtml = `<p>查看我们的<a href="${caseLinks[category] || '/cases'}">成功案例</a>了解更多${category}实践经验。</p>`;
  optimized = optimized.slice(0, middleIndex) + caseLinkHtml + optimized.slice(middleIndex);
  
  // 3. 在末尾插入相关文章链接
  const articleLinkHtml = `<p>相关阅读：<a href="${articleLink}">了解更多${category}相关内容</a></p>`;
  optimized = optimized + articleLinkHtml;
  
  return optimized;
}

// 添加图片占位符
function addImagePlaceholders(content, title) {
  const imgHtml = `
<figure class="article-image">
  <img src="/images/articles/placeholder.jpg" alt="${title}" loading="lazy">
  <figcaption>${title}</figcaption>
</figure>`;
  
  // 在第一个H2前插入图片
  const firstH2Index = content.indexOf('<h2');
  if (firstH2Index !== -1) {
    return content.slice(0, firstH2Index) + imgHtml + content.slice(firstH2Index);
  }
  
  return imgHtml + content;
}

// 优化单篇文章
async function optimizeArticle(db, article) {
  const { id, title, category, content } = article;
  
  // 计算当前分数
  const currentScore = calculateSurferScore(article);
  
  // 如果分数已经很高，跳过
  if (currentScore.score >= 80) {
    console.log(`跳过文章 ${id}: 分数已达标 (${currentScore.score})`);
    return null;
  }
  
  // 优化内容
  let optimizedContent = content;
  
  // 1. 添加内链
  if (currentScore.internalLinks < 3) {
    optimizedContent = addInternalLinks(optimizedContent, id, category);
  }
  
  // 2. 添加图片占位符
  if (currentScore.imgCount < 2) {
    optimizedContent = addImagePlaceholders(optimizedContent, title);
  }
  
  // 更新数据库
  await db.execute(
    'UPDATE articles SET content = ? WHERE id = ?',
    [optimizedContent, id]
  );
  
  // 计算优化后的分数
  const newScore = calculateSurferScore({ content: optimizedContent });
  
  console.log(`优化文章 ${id}: ${currentScore.score}分 -> ${newScore.score}分`);
  return { id, oldScore: currentScore.score, newScore: newScore.score };
}

// 主函数
async function main() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'huizhiyunma',
    password: process.env.DB_PASSWORD,
    database: 'huizhiyunma_db'
  });
  
  console.log('=== Surfer SEO 文章优化 ===');
  
  // 获取所有文章
  const [articles] = await db.execute(
    'SELECT id, title, category, content FROM articles ORDER BY id'
  );
  
  console.log(`待优化文章: ${articles.length}篇`);
  
  // 优化文章
  let optimizedCount = 0;
  let totalScoreImprovement = 0;
  
  for (const article of articles) {
    const result = await optimizeArticle(db, article);
    if (result) {
      optimizedCount++;
      totalScoreImprovement += (result.newScore - result.oldScore);
    }
  }
  
  console.log(`\n=== 优化完成 ===`);
  console.log(`优化文章数: ${optimizedCount}`);
  console.log(`平均分数提升: ${(totalScoreImprovement / optimizedCount).toFixed(1)}`);
  
  await db.end();
}

main().catch(console.error);

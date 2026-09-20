require('dotenv').config({ path: '/data/web/huizhiyunma/backend/.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');

const THRESHOLD = 0.72;   // 标题 bigram Jaccard 阈值
const MIN_LEN_KEEP = 0;   // 保留字数最多

function norm(t){
  return String(t||'')
    .replace(/[0-9]{4}\s*年?/g,'')
    .replace(/[（(][^）)]*[）)]/g,'')
    .replace(/[：:？?！!，,。.、\-—_·\s"'「」【】|]/g,'')
    .toLowerCase();
}
function bigrams(t){
  const s = norm(t).replace(/[^\u4e00-\u9fa5a-z0-9]/g,'');
  const g = new Set();
  for (let i=0;i<s.length-1;i++) g.add(s.slice(i,i+2));
  return g;
}
function jac(A,B){
  if(!A.size||!B.size) return 0;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
  return inter/(A.size+B.size-inter);
}

(async () => {
  const p = await mysql.createPool({host:'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
  const [art] = await p.query('SELECT id,title,LENGTH(content) len,category,published_at FROM articles WHERE status=1 ORDER BY id');

  // 并查集
  const parent = {};
  art.forEach(a => parent[a.id] = a.id);
  const find = x => { while(parent[x]!==x){ parent[x]=parent[parent[x]]; x=parent[x]; } return x; };
  const union = (a,b) => { const ra=find(a), rb=find(b); if(ra!==rb) parent[rb]=ra; };

  const grams = {};
  art.forEach(a => grams[a.id] = bigrams(a.title));

  let edges = 0;
  for (let i=0;i<art.length;i++){
    for (let j=i+1;j<art.length;j++){
      if (jac(grams[art[i].id], grams[art[j].id]) >= THRESHOLD) { union(art[i].id, art[j].id); edges++; }
    }
  }

  const clusters = {};
  art.forEach(a => { const r = find(a.id); (clusters[r] = clusters[r] || []).push(a); });

  const plan = [];
  let mergeCount = 0, keepCount = 0;
  console.log('阈值 =', THRESHOLD, '| 边数 =', edges);
  console.log('\n=== 需要合并的簇 ===');
  for (const [root, members] of Object.entries(clusters)) {
    if (members.length < 2) { keepCount++; continue; }
    members.sort((a,b) => (b.len||0)-(a.len||0));
    const keep = members[0];
    const drops = members.slice(1);
    keepCount++; mergeCount += drops.length;
    console.log(`\n【保留】#${keep.id} (${keep.len}字) ${keep.title}`);
    drops.forEach(d => console.log(`   ↳ 合并 #${d.id} (${d.len}字) → 301 到 #${keep.id}   "${d.title}"`));
    drops.forEach(d => plan.push({ old_id: d.id, new_id: keep.id, old_title: d.title, keep_title: keep.title }));
  }
  console.log(`\n单篇保留: ${keepCount} 组 | 待合并下架: ${mergeCount} 篇 | 合并后文章数: ${keepCount}`);

  fs.writeFileSync('/data/web/huizhiyunma/backend/seo/merged-articles.json',
    JSON.stringify(plan, null, 2), 'utf-8');
  console.log('\n计划已写入 merged-articles.json');
  await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

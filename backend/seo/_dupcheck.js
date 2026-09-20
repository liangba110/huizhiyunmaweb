require('dotenv').config({ path: '/data/web/huizhiyunma/backend/.env' });
const mysql = require('mysql2/promise');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const p = await mysql.createPool({host:'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
  const [art] = await p.query('SELECT id,title,summary,content,category,published_at,LENGTH(content) len FROM articles WHERE status=1 ORDER BY id');
  console.log('已发布文章数:', art.length);

  // 停用词剥离后标题指纹
  function norm(t){ return String(t||'').replace(/[0-9]{4}\s*年?/g,'').replace(/[（(][^）)]*[）)]/g,'')
    .replace(/[：:？?！!，,。.、\-—_·\s"'「」【】]/g,'').toLowerCase(); }
  const groups = {};
  for (const a of art) {
    const k = norm(a.title);
    (groups[k] = groups[k] || []).push(a);
  }
  console.log('\n=== 标题指纹完全相同的组 ===');
  let exact = 0;
  for (const [k,v] of Object.entries(groups)) {
    if (v.length > 1) { exact++; console.log(v.map(x=>x.id+':'+x.title).join('\n  ),( ')); }
  }
  if (!exact) console.log('（无）');

  // 标题字符集重叠度高（Jaccard >= 0.7）的组
  console.log('\n=== 标题高度相似的组 (Jaccard>=0.65) ===');
  function bigrams(t){ const s = norm(t).replace(/[^\u4e00-\u9fa5a-z0-9]/g,''); const g=new Set(); for(let i=0;i<s.length-1;i++) g.add(s.slice(i,i+2)); return g; }
  const seen = new Set(); let found=0;
  for (let i=0;i<art.length;i++){
    for (let j=i+1;j<art.length;j++){
      if (seen.has(art[i].id+'|'+art[j].id)) continue;
      const A=bigrams(art[i].title), B=bigrams(art[j].title);
      if (!A.size||!B.size) continue;
      let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
      const jac = inter/(A.size+B.size-inter);
      if (jac>=0.65){
        seen.add(art[i].id+'|'+art[j].id); found++;
        console.log(`  jac=${jac.toFixed(2)}  #${art[i].id}(${art[i].len}字) "${art[i].title.slice(0,34)}"  VS  #${art[j].id}(${art[j].len}字) "${art[j].title.slice(0,34)}"`);
      }
    }
  }
  if (!found) console.log('（无）');
  await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

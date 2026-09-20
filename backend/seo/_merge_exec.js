require('dotenv').config({ path: '/data/web/huizhiyunma/backend/.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const TH = 0.50;

function norm(t){ return String(t||'').replace(/[0-9]{4}\s*年?/g,'').replace(/[（(][^）)]*[）)]/g,'')
  .replace(/[：:？?！!，,。.、\-—_·\s"'「」【】|]/g,'').toLowerCase(); }
function bigrams(t){ const s=norm(t).replace(/[^\u4e00-\u9fa5a-z0-9]/g,''); const g=new Set();
  for(let i=0;i<s.length-1;i++) g.add(s.slice(i,i+2)); return g; }
function jac(A,B){ if(!A.size||!B.size) return 0; let n=0; A.forEach(x=>{if(B.has(x))n++;}); return n/(A.size+B.size-n); }

(async () => {
  const p = await mysql.createPool({host:'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
  const [art] = await p.query('SELECT id,title,LENGTH(content) len FROM articles WHERE status=1 ORDER BY id');
  const grams={}; art.forEach(a=>grams[a.id]=bigrams(a.title));
  const parent={}; art.forEach(a=>parent[a.id]=a.id);
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  const union=(a,b)=>{const ra=find(a),rb=find(b); if(ra!==rb)parent[rb]=ra;};
  for(let i=0;i<art.length;i++) for(let j=i+1;j<art.length;j++)
    if(jac(grams[art[i].id],grams[art[j].id])>=TH) union(art[i].id,art[j].id);
  const cl={}; art.forEach(a=>{const r=find(a.id);(cl[r]=cl[r]||[]).push(a);});

  const plan=[]; const dropIds=[];
  for (const v of Object.values(cl)) {
    if (v.length<2) continue;
    v.sort((a,b)=>(b.len||0)-(a.len||0));
    v.slice(1).forEach(d=>{ plan.push({old_id:d.id,new_id:v[0].id,old_title:d.title,keep_title:v[0].title}); dropIds.push(d.id); });
  }
  console.log('待下架文章数:', dropIds.length);

  if (dropIds.length) {
    // 保存原 status 以便回滚
    const [orig] = await p.query('SELECT id,status FROM articles WHERE id IN (?)', [dropIds]);
    fs.writeFileSync('/data/web/huizhiyunma/backend/seo/merge-rollback.json',
      JSON.stringify({ts:new Date().toISOString(), original:orig}, null, 2), 'utf-8');
    await p.query('UPDATE articles SET status=0 WHERE id IN (?)', [dropIds]);
    console.log('已下架:', dropIds.join(','));
  }
  fs.writeFileSync('/data/web/huizhiyunma/backend/seo/merged-articles.json',
    JSON.stringify(plan, null, 2), 'utf-8');
  const [[{c}]] = await p.query('SELECT COUNT(*) c FROM articles WHERE status=1');
  console.log('剩余已发布文章:', c);
  await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

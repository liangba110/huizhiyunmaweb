require('dotenv').config({ path: '/data/web/huizhiyunma/backend/.env' });
const mysql = require('mysql2/promise');

function norm(t){
  return String(t||'').replace(/[0-9]{4}\s*年?/g,'').replace(/[（(][^）)]*[）)]/g,'')
    .replace(/[：:？?！!，,。.、\-—_·\s"'「」【】|]/g,'').toLowerCase();
}
function bigrams(t){
  const s = norm(t).replace(/[^\u4e00-\u9fa5a-z0-9]/g,''); const g=new Set();
  for (let i=0;i<s.length-1;i++) g.add(s.slice(i,i+2)); return g;
}
function jac(A,B){ if(!A.size||!B.size) return 0; let n=0; A.forEach(x=>{if(B.has(x))n++;}); return n/(A.size+B.size-n); }

(async () => {
  const p = await mysql.createPool({host:'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
  const [art] = await p.query('SELECT id,title,LENGTH(content) len FROM articles WHERE status=1 ORDER BY id');
  const grams = {}; art.forEach(a => grams[a.id]=bigrams(a.title));

  for (const TH of [0.50, 0.45]) {
    const parent = {}; art.forEach(a=>parent[a.id]=a.id);
    const find = x=>{ while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];} return x; };
    const union=(a,b)=>{const ra=find(a),rb=find(b); if(ra!==rb)parent[rb]=ra;};
    for (let i=0;i<art.length;i++) for (let j=i+1;j<art.length;j++)
      if (jac(grams[art[i].id],grams[art[j].id])>=TH) union(art[i].id,art[j].id);
    const cl={}; art.forEach(a=>{const r=find(a.id);(cl[r]=cl[r]||[]).push(a);});
    const multi = Object.values(cl).filter(v=>v.length>1);
    let drops=0; multi.forEach(v=>drops+=v.length-1);
    console.log(`\n===== 阈值 ${TH}：簇数 ${multi.length}，待合并 ${drops} 篇，合并后 ${art.length-drops} 篇 =====`);
    multi.sort((a,b)=>b.length-a.length).forEach(v=>{
      v.sort((a,b)=>(b.len||0)-(a.len||0));
      console.log(`【保留 #${v[0].id} ${v[0].len}字】${v[0].title}`);
      v.slice(1).forEach(d=>console.log(`   ↳ #${d.id} (${d.len}字) ${d.title}`));
    });
  }
  await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

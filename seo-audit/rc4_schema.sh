#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
cd /data/web/huizhiyunma/backend
echo "=== articles 表结构 ==="
node -e "
require('dotenv').config();
const mysql=require('mysql2/promise');
(async()=>{
 const p=await mysql.createPool({host:'127.0.0.1',port:3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
 const [c]=await p.query('SHOW COLUMNS FROM articles');
 console.log(c.map(x=>x.Field+':'+x.Type).join('  '));
 const [r]=await p.query('SELECT id,title,published_at,updated_at,status FROM articles ORDER BY id DESC LIMIT 5');
 console.log(JSON.stringify(r,null,1));
 const [d]=await p.query('SELECT title, COUNT(*) c, GROUP_CONCAT(id) ids FROM articles WHERE status=1 GROUP BY title HAVING c>1');
 console.log('完全同名标题:', JSON.stringify(d));
 const [n]=await p.query('SELECT COUNT(*) c FROM articles WHERE status=1');
 console.log('已发布文章:', JSON.stringify(n));
 const [cl]=await p.query('SELECT COUNT(*) c FROM cases WHERE status=1');
 console.log('案例:', JSON.stringify(cl));
 await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
"
echo
echo "=== placeholder 图片来源 ==="
grep -rn 'placeholder' /data/web/huizhiyunma/backend/seo/*.js | head -10
echo
echo "=== 文章页图片现状 (0/1/2 = id) ==="
grep -c 'article-image' /data/web/huizhiyunma/frontend/dist/seo/articles/*.html 2>/dev/null | grep -v ':0' | wc -l
echo "含 article-image 的文章页数 ↑ / 总文章页数:"
ls /data/web/huizhiyunma/frontend/dist/seo/articles/*.html | wc -l
echo
echo "=== 非优先城市 robots meta（浏览器UA拿到的spa页） ==="
grep -o '<meta name="robots"[^>]*>' /data/web/huizhiyunma/frontend/dist/city/tangshan/spa_index.html 2>/dev/null || echo "无 robots meta"
echo "--- 非优先城市 services.html ---"
grep -o '<meta name="robots"[^>]*>' /data/web/huizhiyunma/frontend/dist/city/tangshan/services.html 2>/dev/null || echo "无"

#!/bin/bash
cd /data/web/huizhiyunma/backend
echo "=== .env (脱敏) ==="
sed -E 's/(PASSWORD|PASS|SECRET|TOKEN)=.*/\1=***/I' .env | head -30
echo
echo "=== 文章 published_at 格式 / 重复标题 ==="
node -e "
require('dotenv').config();
const mysql=require('mysql2/promise');
(async()=>{
 const p=await mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port:process.env.DB_PORT||3306,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,charset:'utf8mb4'});
 const [r]=await p.query('SELECT id,title,published_at,status,updated_at FROM articles ORDER BY id DESC LIMIT 8');
 console.log(JSON.stringify(r,null,1));
 const [d]=await p.query('SELECT title, COUNT(*) c, GROUP_CONCAT(id) ids FROM articles WHERE status=1 GROUP BY title HAVING c>1');
 console.log('完全同名标题组:', JSON.stringify(d));
 const [n]=await p.query('SELECT COUNT(*) c FROM articles WHERE status=1');
 console.log('已发布文章数:', JSON.stringify(n));
 const [ci]=await p.query('SELECT item_key, LEFT(item_value,120) v FROM company_info');
 console.log('company_info:', JSON.stringify(ci,null,1));
 const [cl]=await p.query('SELECT COUNT(*) c FROM cases WHERE status=1');
 console.log('案例数:', JSON.stringify(cl));
 await p.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
"
echo
echo "=== 图片资源 ==="
ls -la /data/web/huizhiyunma/frontend/dist/seo/images/ 2>/dev/null
echo "--- cases 封面数 ---"
ls /data/web/huizhiyunma/frontend/dist/seo/images/cases/ 2>/dev/null | wc -l
echo "--- 是否有 placeholder ---"
find /data/web/huizhiyunma/frontend/dist -name 'placeholder*' 2>/dev/null
echo "--- og-cover ---"
ls -la /data/web/huizhiyunma/frontend/dist/seo/images/og-cover.png 2>/dev/null
echo
echo "=== 生成脚本 ==="
cat run_generate_article.sh
echo "--- run_case_daily.sh ---"
cat run_case_daily.sh
echo
echo "=== 是否装了 ImageMagick / fonts ==="
which convert magick 2>/dev/null; ls /usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc 2>/dev/null || echo "字体缺失"

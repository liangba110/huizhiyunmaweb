#!/bin/bash
# =============================================
# 全自动多引擎推送 - Bing IndexNow（无需注册token）
# 支持: Bing / Yandex / Naver / Seznam (IndexNow 联盟)
# 用法: sudo bash push_indexnow.sh [all|new]
#   all  = 推送全站 sitemap 全部 URL（首次用）
#   new  = 只推送当天新增文章（每日 cron 用，默认）
# =============================================
set -e

SITE="https://openai2000.cn"
BASE="/data/web/huizhiyunma/backend/seo"
KEY_FILE="$BASE/indexnow_key.txt"
LOG="$BASE/push_indexnow.log"
MODE="${1:-new}"

# 1. 生成/读取 IndexNow Key（32位hex，一次性生成后固定）
if [ ! -f "$KEY_FILE" ]; then
  KEY=$(openssl rand -hex 16)
  echo "$KEY" > "$KEY_FILE"
  chown www-data:www-data "$KEY_FILE"
  # 把 key 文件放到网站根目录供 IndexNow 验证
  cp "$KEY_FILE" /data/web/huizhiyunma/frontend/dist/"$KEY.txt"
  chown www-data:www-data /data/web/huizhiyunma/frontend/dist/"$KEY.txt"
else
  KEY=$(cat "$KEY_FILE")
fi

# 2. 验证 key 文件线上可访问
KEY_URL="$SITE/$KEY.txt"
if ! curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$KEY_URL" | grep -q 200; then
  cp "$KEY_FILE" /data/web/huizhiyunma/frontend/dist/"$KEY.txt"
  chown www-data:www-data /data/web/huizhiyunma/frontend/dist/"$KEY.txt"
fi

# 3. 收集 URL
WORK="$BASE/.push_tmp"
mkdir -p "$WORK"

if [ "$MODE" = "all" ]; then
  # 全站：从 sitemap 提取
  curl -s --max-time 15 "$SITE/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g' > "$WORK/indexnow_urls.txt"
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') 全站推送，共 $(wc -l < "$WORK/indexnow_urls.txt") 条 ===" >> "$LOG"
else
  # 增量：当天新增文章（数据库查询）
  export MYSQL_PWD=$(grep '^DB_PASSWORD=' /data/web/huizhiyunma/backend/.env 2>/dev/null | cut -d= -f2-)
  mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e \
    "SELECT CONCAT('$SITE/articles/', id) FROM articles WHERE status=1 AND DATE(published_at)=CURDATE();" 2>/dev/null \
    > "$WORK/indexnow_urls.txt"
  # 加上今天重建的静态页（sitemap 里 lastmod=今天的）
  curl -s --max-time 15 "$SITE/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g' > "$WORK/all_urls.txt"
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') 增量推送，当天新增 $(wc -l < "$WORK/indexnow_urls.txt") 条 ===" >> "$LOG"
fi

COUNT=$(wc -l < "$WORK/indexnow_urls.txt" | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "无新增URL，跳过" >> "$LOG"
  exit 0
fi

# 4. 构造 JSON 并推送（IndexNow 协议）
python3 - "$WORK/indexnow_urls.txt" "$KEY" "$SITE" <<'PYEOF' >> "$LOG" 2>&1
import json, sys, urllib.request

urls_file, key, site = sys.argv[1], sys.argv[2], sys.argv[3]
urls = [l.strip() for l in open(urls_file, encoding='utf-8') if l.strip()]
if not urls:
    sys.exit(0)

payload = json.dumps({
    "host": site.replace("https://", ""),
    "key": key,
    "keyLocation": f"{site}/{key}.txt",
    "urlList": urls[:500]
}).encode('utf-8')

req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=payload,
    headers={"Content-Type": "application/json; charset=utf-8"},
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        print(f"✅ IndexNow 推送成功 ({resp.status})，共 {len(urls)} 条")
except urllib.error.HTTPError as e:
    print(f"❌ IndexNow 推送失败 HTTP {e.code}: {e.read().decode(errors='ignore')[:200]}")
except Exception as e:
    print(f"❌ IndexNow 推送异常: {e}")
PYEOF

echo "=== 完成 ===" >> "$LOG"

#!/bin/bash
# 【安全】百度推送 token 不硬编码，实际值由下方 source backend/.env 提供
#         （需在 .env 中配置 BAIDU_TOKEN=xxxxxx）
BAIDU_TOKEN=""
SITE="openai2000.cn"
LOG="/data/web/huizhiyunma/scripts/push_log.txt"

source /data/web/huizhiyunma/backend/.env

if [ -z "$BAIDU_TOKEN" ]; then
  echo "❌ 未配置 BAIDU_TOKEN：请在 /data/web/huizhiyunma/backend/.env 中添加 BAIDU_TOKEN=xxxxxx" >&2
  exit 1
fi

# 获取所有文章URL
URLS="https://openai2000.cn/
https://openai2000.cn/services
https://openai2000.cn/cases
https://openai2000.cn/about
https://openai2000.cn/contact
https://openai2000.cn/templates
https://openai2000.cn/packages
https://openai2000.cn/articles
https://openai2000.cn/city"

# 动态获取所有案例URL
for id in $(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT id FROM cases WHERE status=1;"); do
  URLS="$URLS
https://openai2000.cn/cases/$id"
done

# 动态获取所有文章URL
for id in $(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e "SELECT id FROM articles WHERE status=1;"); do
  URLS="$URLS
https://openai2000.cn/articles/$id"
done

# City subdomain URLs
while IFS= read -r subdomain; do
  URLS="$URLS
https://${subdomain}.openai2000.cn/"
done < <(node -e "const d=require('/data/web/huizhiyunma/backend/seo/cities.json'); d.provinces.forEach(p => p.cities.forEach(c => console.log(c.subdomain)))")

while IFS= read -r subdomain; do
  URLS="$URLS
https://openai2000.cn/city/${subdomain}"
done < <(node -e "const d=require('/data/web/huizhiyunma/backend/seo/cities.json'); d.provinces.forEach(p => p.cities.forEach(c => console.log(c.subdomain)))")

TOTAL=$(echo "$URLS" | wc -l)
echo "$(date "+%Y-%m-%d %H:%M:%S") Pushing $TOTAL URLs..."

# Baidu push limit is 2000 URLs per request
echo "$URLS" | head -2000 > /tmp/push_batch.txt

RESULT=$(curl -s -H "Content-Type: text/plain" --data-binary "@/tmp/push_batch.txt" "http://data.zz.baidu.com/urls?site=https://$SITE&token=$BAIDU_TOKEN")

echo "$(date "+%Y-%m-%d %H:%M:%S") Total: $TOTAL, $RESULT" >> "$LOG"
tail -2000 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
echo "Done: $RESULT"

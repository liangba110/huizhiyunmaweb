#!/bin/bash
# 每日 SEO 文章 - 时段监控补跑脚本
# 作用：每个发布时段后 30 分钟运行，检查当天已发布篇数是否达标，
#       未达标则自动补跑对应时段，保证每天 3 篇按时完成
# 用法：bash /data/web/huizhiyunma/backend/seo/check_article_publish.sh [1|2|3]
#   slot 1 = 09:30 检查  slot 2 = 13:30 检查  slot 3 = 17:30 检查
# 补跑失败时自动通知老板 QQ
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
SCRIPT_DIR="/data/web/huizhiyunma/backend/seo"
LOG="$SCRIPT_DIR/generate_article.log"
NOTIFY="/data/disk/notify_qq.sh"
SLOT="${1:-1}"
TARGET=$SLOT   # slot1 要求至少1篇，slot2 至少2篇，slot3 至少3篇
SLOT_NAMES=("" "09:00第1篇" "13:00第2篇" "17:00第3篇")

echo "=== $(date '+%Y-%m-%d %H:%M:%S') 时段监控（slot=$SLOT，目标≥${TARGET}篇） ===" >> "$LOG"

COUNT=$(cd "$SCRIPT_DIR" && sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node count_today.js 2>/dev/null)
if [ -z "$COUNT" ] || ! echo "$COUNT" | grep -qE '^[0-9]+$'; then
  echo "⚠️ 查询今日篇数失败，等待 60 秒重试一次" >> "$LOG"
  sleep 60
  COUNT=$(cd "$SCRIPT_DIR" && sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node count_today.js 2>/dev/null)
fi
COUNT=${COUNT:-0}
echo "📊 当前今日已发布：${COUNT} 篇（目标≥${TARGET}篇）" >> "$LOG"

if [ "$COUNT" -ge "$TARGET" ]; then
  echo "✅ 篇数达标，无需补跑" >> "$LOG"
  exit 0
fi

# 未达标 → 补跑该时段（最多尝试2轮，每轮内部自带4次重试）
echo "⚠️ 未达标（${COUNT}/${TARGET}），自动补跑 slot=$SLOT" >> "$LOG"
bash "$SCRIPT_DIR/run_generate_article.sh" "$SLOT" >> "$LOG" 2>&1

# 补跑后再查一次
COUNT2=$(cd "$SCRIPT_DIR" && sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node count_today.js 2>/dev/null)
COUNT2=${COUNT2:-0}
if [ "$COUNT2" -ge "$TARGET" ]; then
  echo "✅ 补跑成功，今日已发布 ${COUNT2} 篇" >> "$LOG"
  bash "$NOTIFY" "✅ SEO文章补跑成功（${SLOT_NAMES[$SLOT]} 时段未按时发布，已自动补发）
今日已发布 ${COUNT2}/3 篇" >> "$LOG" 2>&1
else
  echo "❌ 补跑后仍未达标（${COUNT2}/${TARGET}），等待下次检查" >> "$LOG"
  bash "$NOTIFY" "⚠️ SEO文章补跑失败（${SLOT_NAMES[$SLOT]}）
当前今日已发布 ${COUNT2}/${TARGET} 篇，未达标！
请人工检查 DeepSeek API 或网络问题！
日志：$LOG" >> "$LOG" 2>&1
  exit 1
fi

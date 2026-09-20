#!/bin/bash
# 每日 AI SEO 文章生成 - cron wrapper（每天3篇，分时段 + 失败自动重试）
# 解决 cron 环境找不到 node 的问题（nvm 路径不在 cron PATH 中）
# 用法：bash /data/web/huizhiyunma/backend/seo/run_generate_article.sh [1|2|3]
#   slot 1 = 09:00  slot 2 = 13:00  slot 3 = 17:00
# 用 sudo 执行：保证静态页/sitemap 写入 frontend/dist（属主 www-data）有权限
# 失败自动重试：单次执行失败后，隔 60 秒重试，最多 3 次（合计 4 次尝试）
# 完成后自动通知老板 QQ
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
SCRIPT_DIR="/data/web/huizhiyunma/backend/seo"
LOG="$SCRIPT_DIR/generate_article.log"
NOTIFY="/data/disk/notify_qq.sh"
SLOT="${1:-1}"
MAX_ATTEMPTS=4
SLOT_NAMES=("" "09:00第1篇" "13:00第2篇" "17:00第3篇")

# 防护：dist 若被 ubuntu 等用户重建过（如手动 vite build），属主会漂移，先统一回 www-data
if [ -d /data/web/huizhiyunma/frontend/dist ]; then
  BAD=$(find /data/web/huizhiyunma/frontend/dist -not -user www-data | head -1)
  if [ -n "$BAD" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔧 检测到 dist 属主漂移，自动修复为 www-data" >> "$LOG"
    sudo chown -R www-data:www-data /data/web/huizhiyunma/frontend/dist
  fi
fi

# 主模型预检：Ark（火山方舟）鉴权失败直接通知，不浪费重试次数（DeepSeek 欠费仅作兑底）
ARK_KEY=$(grep '^ARK_API_KEY=' /data/web/huizhiyunma/backend/.env | cut -d= -f2)
ARK_URL=$(grep '^ARK_BASE_URL=' /data/web/huizhiyunma/backend/.env | cut -d= -f2)
PRECHECK=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${ARK_URL}/chat/completions" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${ARK_KEY}" \
  -d '{"model":"ark-code-latest","messages":[{"role":"user","content":"ping"}],"max_tokens":5}')
if [ "$PRECHECK" = "401" ] || [ "$PRECHECK" = "403" ]; then
  bash "$NOTIFY" "⚠️ Ark 主模型鉴权失败（HTTP $PRECHECK），SEO文章生成已暂停！\n请检查 ARK_API_KEY 配置。" >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Ark 主模型鉴权失败（$PRECHECK），跳过本次生成" >> "$LOG"
  exit 0
fi

# 捕获最终结果并通知
FINAL_STATUS=""
for attempt in $(seq 1 $MAX_ATTEMPTS); do
  echo ">>> 第 ${attempt}/${MAX_ATTEMPTS} 次尝试（slot=$SLOT）" >> "$LOG"
  cd "$SCRIPT_DIR"
  sudo -n -u www-data env PATH="$PATH" NODE_PATH="$NODE_PATH" node generate_article.js "$SLOT" >> "$LOG" 2>&1
  EXIT=$?

  # 判断结果：0=成功/已满跳过；非0=失败
  if [ $EXIT -eq 0 ]; then
    if grep -q "跳过本次" <<< "$(tail -5 "$LOG")"; then
      FINAL_STATUS="SKIP"
    else
      FINAL_STATUS="OK"
    fi
    break
  fi

  echo ">>> 第 ${attempt} 次失败（exit=$EXIT），60秒后重试" >> "$LOG"
  [ $attempt -lt $MAX_ATTEMPTS ] && sleep 60
  FINAL_STATUS="FAIL"
done

# 取本次执行的最新标题/文章ID（从日志尾部提取）
LAST_TITLE=$(grep "生成标题" "$LOG" | tail -1 | sed 's/.*✅ 生成标题: //')
LAST_ID=$(grep "文章ID:" "$LOG" | tail -1 | grep -oE "文章ID: [0-9]+" | head -1)
TODAY_COUNT=$(tail -20 "$LOG" | grep -oE "今天已发布 [0-9]/3" | tail -1)

case "$FINAL_STATUS" in
  OK)
    bash "$NOTIFY" "✅ SEO文章发布成功（${SLOT_NAMES[$SLOT]}）
${LAST_TITLE}
${LAST_ID} | ${TODAY_COUNT}
已自动：重建静态页+sitemap → 百度推送" >> "$LOG" 2>&1
    ;;
  SKIP)
    # 3篇已满正常跳过，静默不打扰
    echo ">>> 今日已满，静默跳过" >> "$LOG"
    ;;
  FAIL)
    bash "$NOTIFY" "❌ SEO文章发布失败（${SLOT_NAMES[$SLOT]}）
连续 ${MAX_ATTEMPTS} 次 DeepSeek API 请求均失败，请人工检查！
日志：$LOG" >> "$LOG" 2>&1
    exit 1
    ;;
esac
exit 0

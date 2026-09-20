#!/bin/bash
# =============================================
# 每日 AI 案例生成 - cron wrapper
# 用法：bash /data/web/huizhiyunma/backend/seo/run_case_daily.sh
# 说明：
#   - 直接以当前用户运行（dist 目录已授权 ubuntu 写入）
#   - 失败自动重试：最多 3 次尝试（每次间隔 60 秒）
#   - 当天已有新案例时正常跳过
# =============================================
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
SCRIPT_DIR="/data/web/huizhiyunma/backend/seo"
LOG="$SCRIPT_DIR/generate_case.log"

echo ">>> $(date '+%Y-%m-%d %H:%M:%S') 每日案例任务开始" >> "$LOG"

for attempt in 1 2 3; do
  echo ">>> 第 ${attempt}/3 次尝试" >> "$LOG"
  cd "$SCRIPT_DIR"
  node generate_case.js daily >> "$LOG" 2>&1
  EXIT=$?

  if [ $EXIT -eq 0 ]; then
    # 案例生成成功后，重建静态页并推送
    echo ">>> 重建静态页..." >> "$LOG"
    node generate.js >> "$LOG" 2>&1 || echo "⚠️ 静态页重建失败" >> "$LOG"
    echo ">>> 百度推送..." >> "$LOG"
    bash push_baidu.sh new >> "$LOG" 2>&1 || echo "⚠️ 百度推送失败" >> "$LOG"
    echo ">>> IndexNow 推送..." >> "$LOG"
    bash push_indexnow.sh new >> "$LOG" 2>&1 || echo "⚠️ IndexNow 推送失败" >> "$LOG"
    echo ">>> 每日案例任务完成（exit=0）" >> "$LOG"
    exit 0
  fi

  echo ">>> 第 ${attempt} 次失败（exit=$EXIT），60秒后重试" >> "$LOG"
  if [ $attempt -lt 3 ]; then
    sleep 60
  fi
done

echo ">>> 连续 3 次失败，请检查 $LOG" >> "$LOG"
exit 1

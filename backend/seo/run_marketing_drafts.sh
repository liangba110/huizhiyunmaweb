#!/bin/bash
# 自媒体营销草稿每日生成 - cron wrapper
# 用法：bash /data/web/huizhiyunma/backend/seo/run_marketing_drafts.sh
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
LOG="/data/web/huizhiyunma/backend/seo/marketing_drafts.log"
sudo -n -u ubuntu env PATH="$PATH" node /data/web/huizhiyunma/backend/seo/marketing_drafts.cjs >> "$LOG" 2>&1
EXIT=$?
if [ $EXIT -ne 0 ]; then
  bash /data/disk/notify_qq.sh "❌ 自媒体营销草稿生成失败，日志：$LOG" >> "$LOG" 2>&1
fi
exit $EXIT

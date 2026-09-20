#!/bin/bash
# 全站百度收录 - 排队推送 cron wrapper（root crontab 17:45 调用）
# 固定每天最多 6 条，与 9/13/17 点的增量推送错开，不超百度免费配额
# flock 防并发：拿不到 /tmp/push_all.lock 锁直接退出，避免 cron 重复任务叠加
export PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH"
export NODE_PATH="/home/ubuntu/.nvm/versions/node/v22.23.0/lib/node_modules"
cd /data/web/huizhiyunma/backend/seo || exit 1
exec flock -xn /tmp/push_all.lock /home/ubuntu/.nvm/versions/node/v22.23.0/bin/node /data/web/huizhiyunma/backend/seo/push-all-queue.mjs >> /data/web/huizhiyunma/backend/seo/push_all.log 2>&1

#!/bin/bash
# =============================================
# 汇智云码 百度普通收录 - 增量推送脚本（2026-08-10 改造）
# 原问题：一次推全站 33 条 → over quota（百度免费配额 ~10条/天）
# 新逻辑：每天只推「当天新增文章」，把有限配额用在刀刃上；
#        首次全站推送通过 IndexNow 完成（Bing/Yandex 通道不限量）
# 用法: bash push_baidu.sh [all|new]   (默认 new=增量)
# =============================================
# 【安全】凭证不硬编码：优先取环境变量，其次读 backend/.env
ENV_FILE="/data/web/huizhiyunma/backend/.env"
if [ -f "$ENV_FILE" ]; then
  [ -n "$BAIDU_TOKEN" ] || BAIDU_TOKEN=$(grep '^BAIDU_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
  [ -n "$DB_PASSWORD" ] || DB_PASSWORD=$(grep '^DB_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
fi
TOKEN="${BAIDU_TOKEN:-}"
SITE="https://openai2000.cn"
BASE="$(cd "$(dirname "$0")" && pwd)"
WORK="$BASE/.push_tmp"
LOG="$BASE/push_baidu.log"
MODE="${1:-new}"

mkdir -p "$WORK"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') 开始推送（$MODE）===" >> "$LOG"

# 收集 URL
if [ "$MODE" = "all" ]; then
  # 全站（尽量少用，配额有限）
  grep -oE '<loc>[^<]+</loc>' /data/web/huizhiyunma/frontend/dist/sitemap.xml | sed 's/<loc>//;s/<\/loc>//' > "$WORK/final.txt"
else
  # 增量：当天新增文章 + 当天新增案例
  export MYSQL_PWD="${DB_PASSWORD:-}"
  mysql -h127.0.0.1 -uhuizhiyunma huizhiyunma_db -N -e \
    "SELECT CONCAT('$SITE/articles/', id) FROM articles WHERE status=1 AND DATE(published_at)=CURDATE()
     UNION ALL
     SELECT CONCAT('$SITE/cases/', id) FROM cases WHERE status=1 AND DATE(created_at)=CURDATE();" 2>/dev/null \
    > "$WORK/final.txt"
fi

COUNT=$(wc -l < "$WORK/final.txt" | tr -d ' ')
if [ "$COUNT" -eq 0 ]; then
  echo "无新增URL（今天暂无新文章），跳过推送" >> "$LOG"
  echo "=== 完成 ===" >> "$LOG"
  exit 0
fi

echo "待推URL总数: $COUNT" >> "$LOG"
RESULT=$(curl -s -H 'Content-Type:text/plain' --data-binary @"$WORK/final.txt" "http://data.zz.baidu.com/urls?site=$SITE&token=$TOKEN")
echo "推送结果: $RESULT" >> "$LOG"

# 结果校验：success 数量 vs 失败原因
if echo "$RESULT" | grep -qE '"success":[1-9]'; then
  echo "✅ 百度推送成功" >> "$LOG"
elif echo "$RESULT" | grep -q 'over quota'; then
  # 【2026-09-15 修复】原手动提交通道 https://ziyuan.baidu.com/linksubmit/save
  # 需要登录态 cookie，脚本无 cookie 时只会拿到登录页 HTML，属于无效提交。
  # 改为：配额用尽时改用 IndexNow 通道（Bing/Yandex/Naver/Seznam，无配额限制），
  # 余下 URL 同时写入待推队列，等次日配额恢复后由增量逻辑带上。
  echo "⚠️ 百度主动推送配额已用尽（免费配额约10条/天），转投 IndexNow 通道" >> "$LOG"
  if [ -x "$(dirname "$0")/push_indexnow.sh" ] || [ -f "$(dirname "$0")/push_indexnow.sh" ]; then
    if bash "$(dirname "$0")/push_indexnow.sh" all >> "$LOG" 2>&1; then
      echo "✅ 已通过 IndexNow 推送全站（Bing/Yandex/Naver/Seznam）" >> "$LOG"
    else
      echo "⚠️ IndexNow 推送失败" >> "$LOG"
    fi
  fi
  # 把未推成功的 URL 落盘排队，次日配额恢复后重试
  QUEUE="$(dirname "$0")/.push_tmp/baidu_queue.txt"
  if [ -f "$QUEUE" ]; then
    cat "$WORK/final.txt" >> "$QUEUE"
  else
    cp "$WORK/final.txt" "$QUEUE"
  fi
  sort -u "$QUEUE" -o "$QUEUE"
  echo "📊 已排队 $(wc -l < "$QUEUE" | tr -d ' ') 条待次日推送" >> "$LOG"
else
  echo "⚠️ 百度推送异常: $RESULT" >> "$LOG"
fi

echo "=== 完成 ===" >> "$LOG"

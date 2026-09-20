#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复百度推送脚本的手动提交通道（原代码提交到需要登录的页面，无效）"""
import shutil, datetime

P = '/data/web/huizhiyunma/backend/seo/push_baidu.sh'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(P, encoding='utf-8').read()
shutil.copy(P, f'{P}.bak_{TS}')

OLD = """elif echo "$RESULT" | grep -q 'over quota'; then
  echo "⚠️ 主动推送配额不足，尝试手动提交通道..." >> "$LOG"
  # 手动提交通道（每天额外 200 条配额）
  MANUAL_COUNT=0
  while IFS= read -r url; do
    [ -z "$url" ] && continue
    [ $MANUAL_COUNT -ge 5 ] && break  # 每次最多手动提交5条，避免被限
    MRESULT=$(curl -s -X POST 'https://ziyuan.baidu.com/linksubmit/save' \\
      -H 'Content-Type: application/x-www-form-urlencoded' \\
      -d "url=$url" 2>/dev/null)
    if echo "$MRESULT" | grep -q 'success'; then
      echo "  ✅ 手动提交成功: $url" >> "$LOG"
    else
      echo "  ⚠️ 手动提交失败: $url ($MRESULT)" >> "$LOG"
    fi
    MANUAL_COUNT=$((MANUAL_COUNT + 1))
    sleep 2
  done < "$WORK/final.txt"
  echo "📊 本次手动提交 $MANUAL_COUNT 条" >> "$LOG"
else"""

NEW = """elif echo "$RESULT" | grep -q 'over quota'; then
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
else"""

if OLD in src:
    src = src.replace(OLD, NEW, 1)
    print('OK 百度推送脚本已修复（手动通道改为 IndexNow + 排队）')
else:
    print('X 锚点未找到')

open(P, 'w', encoding='utf-8').write(src)
print('已保存')

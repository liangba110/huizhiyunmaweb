#!/bin/bash
GEN=/data/web/huizhiyunma/backend/seo/generate.js
echo "=== 该行是否含 schema.org ==="
sed -n '2329p' $GEN | grep -c 'schema\.org'
echo "=== 是否含三个星号 ==="
sed -n '2329p' $GEN | grep -c '\*\*\*'
echo "=== 该行前 120 字符（base64 避免脱敏）==="
sed -n '2329p' $GEN | head -c 120 | base64
echo "=== 整个文件 schema.org 出现次数 ==="
grep -c 'schema\.org' $GEN
echo "=== 整个文件 *** 出现次数 ==="
grep -c '\*\*\*' $GEN

# 敏感文件（加密存放）

本目录存放项目中**含凭证的敏感文件**的加密版本。仓库公开，明文一律不入库。

## 加密规格

- 算法：AES-256-GCM
- 密钥派生：PBKDF2-HMAC-SHA256，480000 次迭代，每文件独立随机 salt
- 文件头：`HZY1` + salt(16B) + nonce(12B) + ciphertext+tag
- 工具：`../tools/secrets_tool.py`（需 `pip install cryptography`）

## 解密

口令由项目负责人保管，通过环境变量传入（**不要写进命令行参数**，会留在 shell 历史里）：

```bash
# Linux / macOS
export HZY_SECRET='<口令>'
python3 tools/secrets_tool.py dec secrets-enc/sshx.py.enc _local-secrets/sshx.py

# Windows PowerShell
$env:HZY_SECRET='<口令>'
python tools\secrets_tool.py dec secrets-enc\sshx.py.enc _local-secrets\sshx.py
```

批量解密整个目录：

```bash
python tools/secrets_tool.py decdir secrets-enc _local-secrets
```

Windows 一键脚本：`\.\decrypt.ps1`

## 当前内容

### 独立凭证文件

| 文件 | 说明 |
|---|---|
| `sshx.py.enc` | SSH 执行助手（含服务器 IP / 账号 / 密码），远程跑脚本、上传下载 |
| `ssh_run.py.enc` | SSH 命令执行封装 |
| `step15_push.sh.enc` | 搜索引擎推送步骤脚本（含推送 token） |
| `step17_complete.sh.enc` | 收尾验证脚本（含百度推送 token） |

### 硬编码凭证文件的原文备份

`plain-orig/` 下是仓库内**脱敏前**的原文（数据库密码、百度推送 token 硬编码版本）。
仓库中对应文件已改为读环境变量：

```js
// 变更前
password: '<DB密码>',
// 变更后
password: process.env.DB_PASSWORD,          // 文件顶部已补 dotenv 加载
```

| 原文备份 | 仓库中对应文件 | 脱敏内容 |
|---|---|---|
| `plain-orig/backend/batch_rewrite.js.enc` | `backend/batch_rewrite.js` | DB 密码 |
| `plain-orig/backend/batch_rewrite_v2.js.enc` | `backend/batch_rewrite_v2.js` | DB 密码 |
| `plain-orig/backend/batch_optimize_v3.js.enc` | `backend/batch_optimize_v3.js` | DB 密码 |
| `plain-orig/backend/fix_article6.js.enc` | `backend/fix_article6.js` | DB 密码 |
| `plain-orig/backend/fix_articles_v2.js.enc` | `backend/fix_articles_v2.js` | DB 密码 |
| `plain-orig/backend/fix_zero_articles.js.enc` | `backend/fix_zero_articles.js` | DB 密码 |
| `plain-orig/backend/seo/optimize_articles.js.enc` | `backend/seo/optimize_articles.js` | DB 密码 |
| `plain-orig/backend/seo/rewrite_articles.js.enc` | `backend/seo/rewrite_articles.js` | DB 密码 |
| `plain-orig/backend/seo/push_baidu.sh.enc` | `backend/seo/push_baidu.sh` | DB 密码 + 百度 token |
| `plain-orig/backend/seo/push-all-queue.mjs.enc` | `backend/seo/push-all-queue.mjs` | 百度 token |

### 运维脚本与业务代码

| 原文备份 | 仓库中对应文件 | 脱敏内容 |
|---|---|---|
| `plain-orig/seo-audit/diag2.sh.enc` | `seo-audit/diag2.sh` | DB 密码 |
| `plain-orig/seo-audit/diag3.sh.enc` | `seo-audit/diag3.sh` | DB 密码 |
| `plain-orig/seo-audit/diag6.sh.enc` | `seo-audit/diag6.sh` | DB 密码 |
| `plain-orig/seo-audit/step27_cleanup.sh.enc` | `seo-audit/step27_cleanup.sh` | DB 密码（bash + python 两处） |
| `plain-orig/seo-audit/step28_final.sh.enc` | `seo-audit/step28_final.sh` | DB 密码 |
| `plain-orig/backend/seo/push_indexnow.sh.enc` | `backend/seo/push_indexnow.sh` | DB 密码 |
| `plain-orig/scripts/baidu_push.sh.enc` | `scripts/baidu_push.sh` | 百度 token（第二枚） |
| `plain-orig/backend/routes/payment.js.enc` | `backend/routes/payment.js` | 支付网关回调鉴权 token |

## ⚠ 服务器 .env 需补齐的键

脱敏后这些值不再硬编码，需写入 `/data/web/huizhiyunma/backend/.env`，否则对应功能失效：

| 键 | 用途 | 受影响文件 |
|---|---|---|
| `BAIDU_TOKEN` | 百度普通收录主动推送 token | `push_baidu.sh`、`push-all-queue.mjs`、`push_indexnow.sh`、`scripts/baidu_push.sh` |
| `PAY_NOTIFY_TOKEN` | 支付网关 `_notify_merchant` 回调鉴权 | `backend/routes/payment.js` |

> `DB_PASSWORD` 已在 `.env` 中存在，无需新增。
> 新增后建议重启后端：`pm2 restart huizhiyunma`

> 服务器 `/data/web/huizhiyunma/` 上的原件仍是硬编码版本（本次未改动线上）。
> 如需同步脱敏，用上述备份对照修改，或将 `DB_PASSWORD` / `BAIDU_TOKEN` 写入 `.env` 后按仓库版覆盖。

## 新增敏感文件

```bash
python tools/secrets_tool.py enc _local-secrets/<文件> secrets-enc/<文件>.enc
git add secrets-enc/<文件>.enc && git commit -m "chore(secrets): 新增 <文件>"
```

## 安全提示

⚠ 本仓库为 **public**。加密文件的唯一保护是上述口令。
建议将仓库改为 **private**（GitHub → Settings → Danger Zone → Change visibility）以获得双保险。
如怀疑口令泄露，立即在服务器更换 SSH 密码、数据库密码与各 API Key，并重新加密全部文件。

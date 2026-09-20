# 汇智云码 (openai2000.cn)

企业软件服务官网 + SEO 内容站点的完整工作源码。

- 站点: https://openai2000.cn
- 源站: 腾讯云 宝塔 nginx，应用目录 `/data/web/huizhiyunma/`

## 目录结构

```
backend/             Node.js + Express 后端（API、路由、中间件）
  seo/               SEO 自动化：文章生成、城市页生成、百度/IndexNow 推送、白名单
frontend/            Vue 3 + Vite 前端（src/、public/、vite.config.js）
marketing-drafts/    每日营销文案草稿（按日期归档）
templates-demo/      模板商城演示页（standard / premium / pro）
uploads/             上传资源：模板 zip、微信二维码、免费下载文档
scripts/             运维脚本
build.sh             构建脚本
seo-audit/           SEO 全站审计：抓取脚本、诊断脚本、修复 patch、审计报告
tools/               本地工具（secrets_tool.py 加解密）
secrets-enc/         敏感文件加密产物（见其内 README）
```

## 敏感文件

含服务器凭证、数据库密码、推送 token 的文件**不以明文入库**：

- **独立凭证文件**（SSH 工具、推送脚本）→ 明文移至本地 `_local-secrets/`，仓库只存 `secrets-enc/*.enc`
- **源码中的硬编码凭证** → 改为读环境变量（`process.env.DB_PASSWORD` 等），原文加密备份到 `secrets-enc/plain-orig/`

加密规格与解密方法见 [`secrets-enc/README.md`](secrets-enc/README.md)。

## 未纳入仓库的内容

以下为可再生产物或体积过大，未纳入版本管理：

| 路径 | 原因 |
|---|---|
| `*/node_modules/` | 依赖，`npm install` 可恢复 |
| `frontend/dist/` | 构建产物（含 300+ 城市站静态页，约 68MB），由 `backend/seo/generate.js` 生成 |
| `backend/.env` | 含数据库密码、JWT 密钥、第三方 API Key（已加密归档思路见下） |
| `*.bak_*` / `*.log` | 服务器历史备份与运行日志（117 个） |

> `backend/.env` 的**键名清单**记录在 `seo-audit/` 中；如需完整备份请联系项目负责人。

## 部署

```bash
# 前端构建
cd frontend && npm install && npm run build

# 后端
cd backend && npm install && pm2 restart huizhiyunma
```

## 更新仓库

```bash
git add -A
git commit -m "同步: <说明>"
git push origin main
```

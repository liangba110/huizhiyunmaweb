# 汇智云码 (openai2000.cn)

企业软件服务官网 + SEO 内容站点的完整工作源码。

- 站点: https://openai2000.cn
- 源站: 腾讯云 宝塔 nginx，应用目录 `/data/web/huizhiyunma/`

## 目录结构

```
backend/             Node.js + Express 后端（API、路由、中间件）
  seo/               SEO 自动化：文章生成、城市页生成、百度/IndexNow 推送、白名单
frontend/            Vue 3 + Vite 前端（src/、public/、vite.config.js）
  dist/              线上静态页快照（3606 文件，58 MB，已入库）
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
| `backend/.env` | 含数据库密码、JWT 密钥、第三方 API Key（键名清单见 `secrets-enc/README.md`） |
| `*.bak_*` / `*.log` | 服务器历史备份与运行日志（117 个） |

> `frontend/dist/` **已入库**（3606 个文件，58 MB）。它是线上 SEO 内容的唯一快照
> —— 300+ 城市站页面、文章页、案例页、sitemap 均已生成完毕，重新生成依赖数据库与 AI 接口。
> 该目录由 `backend/seo/generate.js` 生成，日常改代码后重新 `npm run build` 再提交即可。

> `backend/.env` 的**键名清单**见 `secrets-enc/README.md`；完整的 `.env` 如需备份请联系项目负责人。

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

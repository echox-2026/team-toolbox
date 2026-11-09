# EchoX 项目组工具库

- 网站：<https://echox-2026.github.io/team-toolbox/>
- 仓库：<https://github.com/echox-2026/team-toolbox>

分四类内容：工作台（网页应用）、原生应用、Skill 与插件、博客。每位上传者一个 BOX。

## 本地开发

需要 Node.js 22。

```bash
npm ci
npm run dev
```

`npm run build` 把网站打包成单个 `dist/index.html`。

## 目录

- `src/hero/`：WebGL 粒子头图
- `src/components/`：抽屉、卡带盒、上传表单、搜索面板、详情抽屉
- `worker/`：上传后端（Cloudflare Worker + D1）
- `.github/workflows/deploy.yml`：网站部署

## 发布

网站：推送到 `main` 后自动构建并发布到 GitHub Pages。

后端：在 `worker/` 目录运行 `npx wrangler deploy`。

## 数据

上传的内容存在 Cloudflare D1 数据库 `echox-catalog`，网站打开时从后端读取。上传不需要登录。工作台、应用和仓库型插件只需填上传人和 GitHub 仓库链接，其余信息由后端从 GitHub 读取；同一个链接再传一次会刷新内容，原上传人不变。

撤回内容：

```bash
npx wrangler d1 execute echox-catalog --remote --command "DELETE FROM entries WHERE id = '条目编号'"
```

备份：

```bash
npx wrangler d1 export echox-catalog --remote --output backup.sql
```

公开仓库不要提交凭据、聊天记录或成员名单。

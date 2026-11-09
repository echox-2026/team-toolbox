# EchoX 项目组工具库

- 网站：<https://echox-2026.github.io/team-toolbox/>
- 仓库：<https://github.com/echox-2026/team-toolbox>

分三类内容：工作台（网页应用）、原生应用（Windows、Linux、macOS）、Skill 与插件。

## 本地开发

需要 Node.js 22。

```bash
npm ci
npm run dev
```

`npm run build` 把网站打包成单个 `dist/index.html`。

## 目录

- `src/hero/`：WebGL 粒子头图
- `src/components/`：抽屉、卡片、上传表单、搜索面板、详情抽屉
- `src/data/entries.json`：网站上显示的全部条目
- `scripts/ingest-issue.mjs`：校验上传内容并写入目录
- `.github/workflows/`：自动发布与部署

## 发布

推送到 `main` 后，`Deploy site` 工作流构建并发布到 GitHub Pages。Pages 的来源需要设为 GitHub Actions。

## 上传

网站上的表单会生成一个标题以 `[上传]` 开头的 GitHub Issue。`Publish upload` 工作流校验内容，写入 `src/data/entries.json`，然后自动部署，不经过人工审核。校验不通过时会在 Issue 里说明原因。每个 GitHub 账号只能更新自己上传的条目。

撤回内容：从 `src/data/entries.json` 删除对应条目并推送。

公开仓库不要提交凭据、聊天记录或成员名单。

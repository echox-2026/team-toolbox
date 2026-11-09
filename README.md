# EchoX 项目组工具库

第一阶段：建立一个可以公开访问的中文首页，并跑通 GitHub Pages 发布链路。

- GitHub 账号：`echox-2026`
- 仓库：<https://github.com/echox-2026/team-toolbox>
- 网站：<https://echox-2026.github.io/team-toolbox/>

## 当前内容

`index.html` 是独立静态首页，包含项目展示、工具下载两个真实空状态和仓库入口。样式直接包含在页面中，不依赖外部字体、脚本或构建工具。页面适配手机与桌面，提供键盘焦点与跳过导航入口。

当前没有真实项目、成员名单、软件发行包或投稿表单。首页明确说明内容和投稿审核功能尚待开放；不提供虚构项目或无效下载。

## 本地查看

直接用浏览器打开 `index.html`。本阶段无安装或构建步骤。

## 发布和更新

在仓库 Settings → Pages 中选择 `Deploy from a branch`，使用 `main` 分支的 `/(root)` 目录。`.nojekyll` 让 GitHub 直接发布静态文件。GitHub 提供的 `pages build and deployment` 工作流负责部署。

修改并提交 `index.html` 到 `main` 后，在 Actions 中等待发布成功，再检查上面的网站地址。项目使用 `/team-toolbox/` 子路径，站内首页链接使用 `./`。

第一阶段采用 GitHub 官方支持的分支发布方式，减少初次连通验证的配置。后续实现内容导入时，再增加受限权限的导入工作流及单独的构建部署工作流。

## 后续阶段

- 项目与工具数据结构、卡片、详情、搜索与筛选。
- GitHub Issue 投稿与更新表单。
- 由管理员维护的成员授权名单、内容快照与人工审核 PR。
- GitHub Releases 真实附件核验与下载入口。

公开仓库只存网站相关材料，不应提交凭据、聊天记录或完整交接压缩包。

## 官方说明

- [创建 GitHub Pages 网站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [设置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

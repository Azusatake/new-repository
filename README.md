# 桃梓 Azusa 官方网站 V2

纯 HTML / CSS / JavaScript，无构建步骤、运行时依赖或前端框架，兼容 GitHub Pages 的项目子目录部署。

## 本地预览

```sh
cd /workspace/new-repository
python3 -m http.server 8001 --bind 127.0.0.1
```

在本机浏览器访问 `http://127.0.0.1:8001/`。也可以在任意静态服务器下预览。第三方播放器和评论需要联网。

## 文件与维护

- `index.html`：内容、SEO / 分享配置、现有直播链接和完整 Giscus 配置。
- `styles.css`：统一设计变量、响应式布局、动效与无障碍焦点样式。
- `site-data.js`：视频数据和四个预留分类。添加作品只需向 `videos` 数组加入对象。
- `app.js`：手机菜单、视频筛选、点击加载播放器、滚动淡入。
- `assets/`：由原头像和用户提供的官方立绘生成的响应式 WebP，以及花形 SVG favicon。`avatar.jpg` 原图保留，分享预览继续使用该图。
- `tests/v2.browser.cjs`：浏览器回归检查。
- `vs/`：原有资源，未改动。

### 添加视频

在 `site-data.js` 中添加真实数据，例如将新对象的 `bvid` 设置为实际 BV 号，并填写已确认的 `title`、`category`、`cover`（相对站点路径）、`publishedAt`（YYYY-MM-DD）、`duration`。未知字段使用 `null`。分类可选：直播切片、翻唱作品、精彩瞬间、特别企划。

当前作品 `BV1hSngzHEe4` 保留；标题、原始封面、日期及分类未得到确认，因此显示 BV 号、封面占位和“待分类”。不将头像伪装成作品封面。点击封面后才请求 Bilibili 播放器；默认不自动播放，关闭后移除 iframe。

### 替换角色图 / 资料

首屏已使用用户提供的 `立绘.zip` 内官方立绘，生成 `assets/azusa-standing-640.webp` 和 `assets/azusa-standing-960.webp`，保留原图白色背景、完整人物比例，不裁切人物或重绘。原头像仍保留在角色介绍中。以后更换立绘时更新 `.character-art` 中的 `srcset`、宽高和 alt，并同步 CSS 比例。原始 4243 × 6000 PNG 保存在上传附件中，站点不加载该大文件。角色资料在 `#about` 的 `.profile` 中维护。

### 直播与粉丝互动

保留直播 ID `1702263460` 和用户提供的完整入口链接。日程是明确标注的空状态，暂未接直播状态 API，不显示“直播中”。补充真实日程时编辑 `#stream .schedule`。

Giscus 配置保持原值（仓库 ID、分类 ID、pathname 映射、light 主题、简体中文及其他属性）。页面路径保持不变可继续关联原讨论。访客需 GitHub 账号，评论数据由 GitHub Discussions 管理，管理者在仓库 Discussions 中处理留言。始终提供 Discussions 备用入口。

投稿、活动、更多社交链接尚未开放，不提供假按钮或假数据。

## 检查

需要 Node.js、Playwright 和 Chromium；这是开发测试依赖，不是站点依赖。在已装有 Playwright 的环境中，先启动静态服务器，再执行：

```sh
node --check app.js
node --check site-data.js
node tests/v2.browser.cjs
```

可通过 `AZUSA_TEST_URL` 指定测试站点（默认为上面的 8001），通过 `CHROMIUM_PATH` 指定 Chromium 可执行文件（默认 `/usr/bin/chromium`）。`AZUSA_SCREENSHOT_DIR` 可指定截图目录。

检查覆盖：320 / 375 / 390 / 600 / 768 / 1024 / 1440px、折叠菜单与 Escape、视频筛选空状态、按需播放器与关闭后的卸载、链接目标、原始 Giscus 配置、评论 iframe 动态高度、200% 字号、减少动画、无 JavaScript 降级与滚动淡入。

测试模拟了外部 Giscus 和 Bilibili 响应，不会发布真实评论。实际 Bilibili 播放、GitHub OAuth 登录、留言提交及分享平台抓图需在联网环境中另行验证。

## 部署与审查

V2 在 `feat/azusa-v2` 独立分支开发；确认前不合并 `main`、不切换线上 Pages 发布源。

代码审查并批准后，将该分支合并到 `main`；GitHub Pages 保持 `main` + `/ (root)` 即可。所有站内资源均为相对路径，无需 npm install 或打包。等待 Pages 工作流部署成功后检查线上链接。不要为预览分支更改正式站点的 Giscus pathname 或提交测试留言。

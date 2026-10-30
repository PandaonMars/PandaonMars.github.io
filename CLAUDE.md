# PandaonMars.github.io — Project Contract

个人站点 `https://pandaonmars.github.io/`。品牌：**Qun Wang · Panda on Mars — 归一 / Back to One**。

跨项目上下文见 `~/.claude/CLAUDE.md`；知识库主仓库在 `~/Back-to-One`。

---

## 分支：只有 `master`

**唯一工作分支 = `master`**，它也是唯一触发部署的分支（见 `.github/workflows/deploy.yml`）。

### 曾经的 `source` 分支及其删除原因（2026-08-01）

历史上还有一个 `source` 分支，已删除。留档说明，避免以后看到旧引用时困惑：

- `source` 与 `master` **没有共同祖先**（`git merge-base` 返回空），是两条完全独立的历史。
- 两者的首个提交都叫 `First commit`，内容都只有一个 `placeholder` 文件；之后是 `Site updated: <时间戳>` 系列——这是 **`hexo-deployer-git` 的指纹**。
- 全历史中 `_config.yml` / `package.json` / `themes/` / `source/_posts/` / `scaffolds/` **零次出现**。

结论：**两条分支都不是源码，都是 Hexo 的构建产物。** 真正的 Hexo 工程从未进入本仓库，只存在于当年的本地机器。`hexo-deployer-git` 在 `.deploy_git/` 里 `git init` 全新仓库再强推，换机器就会甩出一条无关历史——2017 年推到 `source`，2019 年重新部署造出 `master`。

`source` 这个名字**纯属误导，它一行源码都没有**。它的存在只导致同一处改动被手工做两遍（历史上有大量 subject 相同、SHA 不同的重复提交）。

删除前已打归档 tag：**`archive/hexo-source-2017`**，需要时可 `git checkout archive/hexo-source-2017` 找回。

---

## 技术栈

**手写静态 HTML，没有构建步骤。** 没有 `package.json`、没有 SSG、没有 npm scripts。改完直接就是成品。

| 文件 | 说明 |
|---|---|
| `index.html` | 首页，627 行，CSS 全部内联在 `<style>` 里 |
| `blog.html` | 博客列表页，2429 行 |
| `js/three.min.js` + `js/solar.js` | 首页 hero 的 3D 太阳系 |
| `images/panda-logo.png` | 品牌 logo（小熊猫头） |
| `.nojekyll` | 禁止 GitHub Pages 跑 Jekyll —— **不要删** |

### 遗留 Hexo 产物（只读存档）

`2017/`、`2019/`、`archives/`、`categories/`、`tags/`、`page/`、`search.xml`、`sitemap.xml`、`css/main.css`、`lib/`（font-awesome / jquery / ua-parser-js）。

共 **30 篇旧博客**，是早年 Hexo 生成后直接提交的产物。**当作只读存档**——源站已无 Hexo 工程（无 `_config.yml`、无 `themes/`、无 `source/`），重新生成会覆盖手写内容。首页通过 `/archives/` 链过去。

---

## 部署

`.github/workflows/deploy.yml`：

- 触发：push 到 `master`，或手动 `workflow_dispatch`
- 动作：`upload-pages-artifact` 把**仓库根目录整个**作为 artifact 上传 → `deploy-pages`
- 一次性设置：Settings → Pages → Source = "GitHub Actions"

> 因为上传的是整个根目录，**仓库里任何文件都会public可访问**，包括本文件（`/CLAUDE.md`）。放敏感内容前想清楚。

---

## 设计基线

配色定义在 `index.html` 的 `:root` 变量里（火星橙 `--mars:#f2622e`、奶油底 `--bg:#fffaf1`、墨棕 `--ink:#5b4a3d`）。改配色改这里，不要散落硬编码。

字体自托管（不走 Google Fonts CDN，避免欧盟访客 IP 传给第三方）：Space Grotesk / Sora / Noto Serif SC，woff2 放在 `fonts/`，`@font-face` 写在 `index.html` 内联 `<style>` 开头。Noto Serif SC 按 unicode-range 切片，只收页面用到的字所在的切片；新增页面文字若落进没收的切片，需重新从 Google Fonts 下载对应切片。新页面不要再引用 fonts.googleapis.com / fonts.gstatic.com。

素材署名：3D 太阳系纹理来自 solarsystemscope.com，星空背景来自 ESO —— **改动 hero 时保留 credit 链接**。

---

## NEVER

- 不要引入构建步骤 / SSG / npm 依赖——这是刻意的手写站
- 不要删 `.nojekyll`
- 不要重跑 Hexo 或改动 `archives/`、`2017/`、`2019/`、`categories/`、`tags/`、`page/`
- 不要 `git merge` 两个分支（unrelated histories），先问用户
- 不要只推 `source` 就宣称"已上线"——部署认 `master`

## ALWAYS

- commit message 用**英文**（本仓库惯例，与 `Back-to-One` 的中文惯例不同）
- 改完 `index.html` 后用浏览器实际打开确认，尤其 3D hero 和响应式
- 改动要上线：确认落到 `master` 并 push
- 新增 CSS 写进 `index.html` 的内联 `<style>`，与现有 `:root` 变量体系保持一致

## Verification

- HTML 改动：浏览器打开 `index.html` 目视确认，检查窄屏（<768px）不横向溢出
- 部署后：`https://pandaonmars.github.io/` 硬刷新确认；GitHub Actions 页面确认 workflow 绿灯

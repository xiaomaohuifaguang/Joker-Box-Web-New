# ganDaShi — 干大事论坛

`<RequirePermission>`。三视图（列表/详情/发帖）：**state 驱动 + `window.history.pushState` 同步 URL**（`?thread=id`/`?new=1`/无参=列表，`ForumInner`）。**不用 `router.push` 切 query**——软导航不可靠（见 CLAUDE.md「通用坑」）；`popstate` 监听同步前进/后退，URL 可分享/刷新还原。

- **列表**（`PostList`）：搜索+分页+帖子卡（标题/digest/作者/时间/浏览量）。
- **详情**（`PostDetail`）：content 用 `RichContent`（`prose`+`DOMPurify` 渲染）+ 嵌套评论（`CommentSection`/`CommentThread`：根评论分页 + 展开 `replayCount` 条回复 + 回复表单）。
- **发帖**（`NewPost`）：TipTap 编辑器（`RichTextEditor`）→ content(HTML)+text(纯文字)。
- 删帖（作者/admin，`createBy`）；删评论（admin，评论无 createBy）。`usePostPage`/`useComments`。

## TipTap 富文本
TipTap（headless+主题 token，starter-kit+link+placeholder+image，`compact` 评论用）+ `@tailwindcss/typography`(prose) + `DOMPurify`(`typeof window` 守卫避 SSR)。图片 base64 内联，canvas 压缩 maxW=1200 JPEG 0.85，>1MB 拒绝，工具栏+粘贴/拖拽自动插入。

### ResizableImage（`extension-image` extend，`inline:true` 图文混排 + `allowBase64`）
width/height 都存 **px 数值** attrs（拖拽/提交/回显统一单位）。**8 圆饼手柄**（NodeSelection 选中时显示，相对 `NodeViewWrapper as="span"` 定位）：4 角等比、E/W 边中点横向变形、N/S 边中点纵向变形。**拖拽走 PM 事务 `setNodeMarkup`（不直接改 DOM）→ 手柄与图片永远同步；`NodeSelection.create` 锚定 → 选区/光标不跳、可反复缩放**。扩展级 `renderHTML` 把 width/height 合并进**单个 style**（避免各 attribute 的 style 互相覆盖丢失）+ 补 `display:inline-block; vertical-align:middle`（序列化出的 `<img>` 详情页图文同行、基线对齐）。

### `.prose img` margin 特异性坑
`globals.css` 用更高特异性选择器覆盖（`.prose [data-node-view-wrapper] img` 编辑器，否则缩放手柄上下不贴图；`.prose[data-rich-content] img{display:inline-block;vertical-align:middle;margin:0}` 详情页，否则图文换行）——原理见 CLAUDE.md「通用坑」。

### RichContent 窄屏自适应
缩放的图片存内联 px width/height（特异性高于 `prose-img:max-w-full/h-auto`）。宽屏按用户拖的 w/h（含变形）；容器窄于内联 width 时（`ResizeObserver` 检测渲染宽 < 内联宽），JS 清内联 height 回等比 → 不溢出不压扁；回宽屏从 `data-orig-height` 还原变形高度。

# app/(front) — 前台路由组

Route group（`(front)` 不进 URL）。`layout.tsx`(Server) = Header + `{children}` + Footer；有 `loading.tsx`/`error.tsx`。

- `page.tsx`：首页（Server，branding hero）。
- `website/`：收藏网站。`/website/group` 分组，每组 brand 方块标记 + 卡片网格（hover 浮起 + 域名 mono）。左粘性分组导航（桌面竖列 / 移动横向 chip），点分组平滑跳转 + scroll-spy 高亮当前（scroll 监听 + rAF，尊重 reduced-motion）。白名单公开。
- `file-server/`：码头（云盘）。`<RequireAuth>`。双视图（卡片/列表）+ 排序（名称/大小/时间，文件夹置顶）+ 拖拽上传（浮层）+ 右键菜单（项: 打开/下载/重命名/删除；空白区: 上传/新建）+ 面包屑。传参约定：`/file/*` 的 list/createFolder/delete/rename 走 query；upload 走 multipart（自定义 fetch，不走 `lib/api`）；download 走 GET blob+token（触发浏览器下载）。`_components/`(FileCard, FileRow, FileMenuItems, NameDialog)。
- `ganDaShi/`：干大事论坛。`<RequirePermission>`。TipTap 富文本（详见同级 README）。`_components/`(ForumInner, PostList, PostDetail, NewPost, CommentSection, CommentThread, RichTextEditor, RichContent, ResizableImage)。
- `tools/`：`jsonFormat`(JSON 编辑器+结构树，CodeMirror，`_components/JsonTree`)、`cron`(5 段+预设+`cronstrue` 中文描述+`cron-parser` 下次 5 次触发，date-fns 格式化)、`signInCard`(占位)。均 `<RequirePermission>`。
- `code-maker/`、`process/`：占位（`<RequirePermission>`）。
- `_components/`：Header（NavigationMenu + mobile Sheet）、Footer、UserMenu。

导航是 backend-driven（`useMenuTree` menuType=-2），图标读 `menu.icon`。守卫规则见 `components/README.md`。

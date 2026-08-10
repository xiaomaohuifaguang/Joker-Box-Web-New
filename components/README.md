# components — 跨路由共享组件

路由私有的组件放该路由的 `_components/`（不进路由）；这里是**跨路由共享**的。

## ui/
shadcn/ui（`radix-ui`）primitives ~50 个 + `sonner`。`components.json` + `lib/utils.ts` 的 `cn()`(clsx+tailwind-merge)。用主题 token（`bg-background`/`rounded-md`/`shadow-sm` 等），换预设只换 token 值。

## 守卫（统一规则：未登录或无权限 → 404，隐藏页面存在）
- `RequireAuth`：登录守卫（如 `/file-server`）。
- `RequirePermission`：登录 + authPaths 含当前路由（非白名单页，如 `/ganDaShi`、`/tools/*`）。
- `RequireAdmin`：登录 + `admin===true` + 路由在后台菜单树（`/console/*`，菜单树是后端按 token 过滤的真实权限来源）。
- 三者都用 `useMounted` 跳首帧避免已登录刷新闪 404。`ErrorState`/`NotFoundPage`/`ForbiddenPage` 是 404/403 内容块（403 仅测试页用）。

## 根布局常驻 / 全局
- `UserBootstrap`：登录态变化时拉/清用户信息（已登录每次挂载重拉 `fetchUserInfo`，`useRef` 防 setUser 重 fetch 循环）。
- `ThemeSelect`：主题预设切换（前台 Header / 后台顶栏共享）。
- `ComingSoon`：占位页（Server）。
- `Container`：流式内容容器 `w-[85%] max-w-[1600px]`，`className` 可覆盖（全宽页用 `w-full max-w-none`）。
- `ai-chat/`：AI 会话助手（前后台共用，两个 layout 各挂一份）。右下角悬浮钮 + 右侧 Sheet 抽屉。`AiChatWidget` 总装（`useMounted`+`useAuth` 守卫，登录可见）+ Header（模型 Select 默认第一个/新建/历史）+ Messages（user 右 assistant 左，思考块流式展开、出 content 自动折叠，滚动到底）+ Input（Enter 发/Shift+Enter 换行/流式停止）+ SessionList。状态机 `hooks/useAiChat`（sessionId=null 首发后端隐式建会话，SSE 增量累积 content/reasonContent），数据层 `lib/api/aiChat`（流式走 `lib/sse.ts` fetch+ReadableStream 解 data: 帧）。
  assistant 消息 Markdown 渲染（`AiMarkdown`：react-markdown+gfm 懒加载，prose 主题）；头部可切流式/非流式（localStorage `ai-chat-stream` 持久化，非流式走 `chatOnce`）。

## 业务共享件（多管理页共用）
- `menuIcons.tsx`：Menu 图标注册表（`MENU_ICON_GROUPS` 14 类 ~149 个）+ `MenuIcon` switch 渲染（菜单管理选择 + 前台/后台导航渲染共用；硬编码 switch 规避 react-hooks static-components）。
- `ApiPathBindingTree`：api 绑定树（服务/分组/apiPath 三级 checkbox，`roleBind` 回显、`whiteList` 禁用）；菜单/角色管理共用。
- `TriCheckbox`：三态勾选框（all/some/none）；`ApiPathBindingTree` + `MenuCheckboxTree` 共用。

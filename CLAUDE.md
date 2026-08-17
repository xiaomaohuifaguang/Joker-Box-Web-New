@AGENTS.md

# Joker Box

A study project built on `create-next-app` (App Router). The frontend is a **static export** (`output: 'export'`) served by nginx; it only renders pages and calls a separate backend API at runtime. The home page is a branding hero; feature pages are implemented incrementally (some are `ComingSoon` placeholders).

## Stack

- **Next.js 16.2.10** (App Router only - no `pages/`), **React 19.2.4**, **TypeScript 5** (strict), **Tailwind CSS v4** (via `@tailwindcss/postcss`; CSS-first config in `app/globals.css` - no `tailwind.config.*`).
- Path alias `@/*` -> project root. Import app code as `@/app/...`.
- **Static export** (`output: 'export'`) -> `out/` for nginx. No SSR / Server Actions / `proxy.ts` / server route handlers; all runtime data is fetched client-side from `/joker-box/*` (dev: `next.config.ts` `rewrites`; prod: nginx).
- **Forms/validation**: `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
- **UI kit**: shadcn/ui (`radix-ui`) in `components/ui/`, `lucide-react` icons, `sonner` toasts. In use: `NavigationMenu`, `Sidebar`, `Sheet`, `Collapsible`, `Tooltip`, `ContextMenu`, `Form`, `Table`, `Dialog`, `AlertDialog`, `Select`, `Sonner`.
- **Drag & drop**: `@dnd-kit/core` + `sortable` + `utilities`（菜单管理树形拖拽排序/改挂）。
- **Editors/parsers**: `@uiw/react-codemirror` + `@codemirror/lang-json` (JSON editor); `cronstrue` (cron→自然语言, zh_CN via `cronstrue/dist/cronstrue-i18n`) + `cron-parser` **v4** (cron 下次触发).
- **Rich text**: TipTap (@tiptap/core react starter-kit extension-link extension-placeholder，headless 用主题 token 自定义) + @tailwindcss/typography (prose 排版) + DOMPurify (内容渲染防 XSS，typeof window 守卫避 SSR)。

## Commands

```bash
npm run dev      # next dev  -> http://localhost:3000  (outputs to .next/dev)
npm run build    # next build  -> static export to out/ (also type-checks)
npm run start    # next start  (serve the production build)
npm run lint     # eslint   (NOTE: `next lint` no longer exists - see gotchas)
npx tsc --noEmit # type-check only, without building
```

## Project layout

顶层：`app/`(路由；`(front)` 前台组 + `console/` 后台 + `login`/`register`/`test`) · `components/`(共享件) · `lib/`(`api/` 数据层 + auth/user/theme/utils) · `hooks/` · `types/` · `public/` · `next.config.ts`(output:'export' + dev rewrites)。

**目录职责不常驻本文件——各目录(及子目录)放着同级 `README.md` 说明该目录做什么、有哪些模块、跨文件才成立的约定。开始动某块代码前先读它的 `README.md`。** README 只记「职责 + 约定」，**不逐一枚举**组件/接口/字段/校验规则（那些查代码）。

**README 同步规则**：改动属于「新增/删除/重命名目录或模块」或「改变跨文件约定（传参风格、守卫规则、共享件归属等）」时，**同次改动更新所在目录的 `README.md`**；仅改实现细节、加普通组件/字段/接口时**不必**动 README。App Router 约定：路由私有组件放该路由 `_components/`（下划线退出路由）；`*README.md` 等非路由文件可安全 colocate 在 `app/` 内（只有 `page.tsx`/`route.ts` 会公开路由）。

## Project structure rules

Architecture: static export served by nginx; the frontend only renders pages and calls a separate backend API. No server-side logic. Many Next.js 16 features (SSR, Server Actions, `proxy`, server route handlers) **do not apply** under static export.

1. **Routing** - `app/` holds only route files. Keep route files thin; put route-specific components in a sibling `_components/` folder (underscore = excluded from routing).
2. **API address** - All backend calls go to relative `/joker-box/...` (root = `BASE_URL` in `lib/api/client.ts`). **Dev**: `next.config.ts` `rewrites` proxies `/joker-box/*` to the backend (same-origin, no CORS). **Prod**: nginx reverse-proxies. No `NEXT_PUBLIC_API_URL`.
3. **Data layer** - All backend calls go through `lib/api/` (typed wrappers returning `ApiResponse<T>`; business errors throw `ApiError` - destructure `.data`). `api.post/put` takes `{ body?, params? }` (body -> JSON, params -> query string auto-encoded); `api.get/delete` takes `params?`. No raw `fetch` in components **except** `lib/api/file.ts` upload (multipart) and download (blob+token) -- direct `fetch` + `getToken()` + `buildQuery()`. Menus 走 `useMenuTree`（backend 按 token 过滤，见 Routing & auth）。
4. **Dynamic content** - Prefer `?id=` query params or client-side fetching. Dynamic `[param]` segments require `generateStaticParams` (must enumerate at build), usually impossible for backend data.
5. **Components** - Default to Server Components; add `'use client'` only for interactivity/state/effects/runtime data. Under static export, runtime data fetching is always client-side.
6. **Naming** - Component files PascalCase; hooks `useXxx.ts`; utils camelCase; folders kebab-case. One component per file.
7. **Imports** - Always use `@/`; no deep relative `../../`.
8. **Assets** - Static files in `public/`. Brand logos from the backend at runtime.
9. **Styling** - Tailwind utilities over tokens in `globals.css` `@theme`. Extract reused class combos into components, not scattered `@apply`.
10. **Types** - API/domain types in `types/`. Strict mode; avoid `any`. Sort/comparators 应对后端 null 字段做兜底（`?? ""`/`?? 0`）。

## Routing & auth

Two sections, unified login. Static export = no server-side route protection; the backend token check is the real boundary, the client guard is UX only.

- **Front** (`/`) - mostly public; wrapped by `app/(front)/layout.tsx` (Header + content + Footer). Header nav is backend-driven (see Menus). Login-only pages wrap in `<RequireAuth>` (e.g. `/file-server`); non-whitelist permission pages use `<RequirePermission>`（如 `/ganDaShi` `/tools/{jsonFormat,cron,signInCard}` `/code-maker` `/process`）; whitelist (public) pages use no guard (e.g. `/website`).
- **Console** (`/console/*`) - `<RequireAdmin>`: not logged in -> 404 (`NotFoundPage`); logged in but `admin !== true` -> 404; admin 但路由不在后台菜单树（`/console` 仪表盘除外，菜单树为后端按 token 过滤的真实权限来源）-> 404（URL 直进无权限路由也挡）; else shadcn `Sidebar` app-shell (`SidebarProvider` + `Sidebar` + `SidebarInset`). 顶栏 = `SidebarTrigger` + `ConsoleBreadcrumb`（从菜单树+路由算路径链，纯文本不可点）+ 主题预设/明暗切换. Sidebar menu backend-driven; 折叠态父项点开向右浮层（DropdownMenu, `side="right"`）; footer 用户菜单（向上展开）= 用户信息 + 返回前台 + 退出登录.
- **Login** (`/login`) - posts `/auth/getToken`, stores token (`data` is the token string), redirects `?from=` (default `/`). 已登录被跳走. 记住密码 checkbox -> base64 localStorage. Inputs uncontrolled; autofill disabled.
- **Register** (`/register`) - `react-hook-form` + `zod` + shadcn `Form`. No auth redirect. Posts `/auth/register`; email code via `/auth/mailCode?mail=` (60s cooldown). zod: required + email format + password match (`refine` on `confirmPassword`); success -> `/login`.
- **Auth state** - `lib/auth.ts` token in localStorage (`auth_token`); `hooks/useAuth` reactive（`logout()` = clearToken + clearUser + `window.location.href="/"` 硬导航跳首页）. 三个守卫统一规则：**未登录或已登录无权限 -> 404**（隐藏页面存在，不跳转、不显示 403）。`RequireAuth`（登录守卫，如 `/file-server`）：未登录 -> 404 ErrorState。`RequirePermission`（权限守卫）：未登录或 authPaths 不含当前路由 -> 404 ErrorState。`RequireAdmin`（后台守卫）：未登录或非 admin -> 404；admin 但路由不在后台菜单树（`/console` 仪表盘除外）-> 404 NotFoundPage（菜单树为后端按 token 过滤的真实权限来源，URL 直进无权限路由也挡）。守卫均用 `useMounted` 跳首帧（token 是 client-only），避免已登录刷新闪 404。
- **API auth** - `lib/api/client.ts` 自动附 token；`code=401` 且带了 token -> `handleUnauthorized` 清 token+用户（细节见 `lib/api/README.md`）。
- **Menus (backend-driven)** - Front Header + Console sidebar pull `POST /menu/menuTree?menuType=<-1|-2>` (`-1` console / `-2` front) via `hooks/useMenuTree.ts` (`lib/api/menu.ts`, `types/menu.ts`). `Menu = { path, name, children?, whiteList }`. **后端已按 token 过滤菜单树**（返回用户可见的项），客户端直接渲染、不再用 `authPaths` 二次过滤。Module-level cache keyed by `menuType + authed + userId`（多 Header 实例共享；登录/登出/换用户 -> key 变 -> 重拉）。首页 hardcoded first in front nav (logo also links home); API `path:"/"` de-duped. 图标读 `menu.icon` 字段（`components/menuIcons.tsx` 的 `MenuIcon`，空/未知不渲染、无兜底）；由菜单管理页配置。 页面级用 `<RequirePermission>` 兜底（直接输 URL 无权限 -> 404）。
- **UserBootstrap** - 根布局常驻。已登录 -> 每次挂载（刷新）都重新 `fetchUserInfo()`（获取最新权限/资料，本地缓存先显示）；未登录但有缓存 -> `clearUser()`。用 `useRef` 防止 `setUser` 触发重 fetch 循环。
- **404 / 403** - Unmatched routes -> `app/not-found.tsx` -> `NotFoundPage`. `/test/403` + `/test/404` render `ForbiddenPage`/`NotFoundPage` for debugging (public). 守卫（RequirePermission/RequireAuth/RequireAdmin）统一 404（不显示 403，隐藏页面存在）。`ForbiddenPage` 仍保留（`FORBIDDEN_PROPS` in `lib/error-pages.ts`）供测试页使用。
- **Loading / error boundaries** - `loading.tsx` + `error.tsx` per segment (`app/`, `app/(front)/`, `app/console/`). Per-segment so chrome stays during load/error. `error.tsx` is client with `reset`.
- **Toasts** - `sonner` `<Toaster position="top-right"/>` in `app/layout.tsx`; `components/ui/sonner.tsx` reads project `useTheme` (`scheme`), themed type colors via per-preset `--success/--warning/--error/--info` + `color-mix` tints (bg=12% tint, text=语义色, border=35% tint). `richColors` enabled. `import { toast } from "sonner"`.
- **Mobile nav** - Front Header hides desktop nav under `md:` + hamburger -> `Sheet` (nav + theme + auth). Console sidebar auto-`Sheet` drawer on mobile (`useIsMobile`).

## Feature pages (implemented)

各模块的**实现细节与坑见所在目录的 `README.md`**（改某个模块前先读它）。已实现的功能入口：

- **前台**：收藏网站 `/website`、码头（云盘）`/file-server`、干大事论坛 `/ganDaShi`、JSON 格式化 `/tools/jsonFormat`、cron `/tools/cron` → `app/(front)/README.md`（ganDaShi 富文本另有同级 README）
- **后台**：机构/用户/角色（`authority/`）、API、菜单、网址收藏、邮件、码表（`system/code-table`）、动态表单设计器（`form/dynamicForm-manager`）→ `app/console/README.md`（动态表单另有同级 README）
- **占位**（`ComingSoon`）：`code-maker`、`process`、`signInCard`、仪表盘、`process-manager`、`displayBoard`、`crawler-task-manager`、`ai/model-manager`、`system/system-prompt`

## ⚠️ Next.js 16 is NOT the Next.js in your training data

This is the single most important thing to know. **本项目是 static export（`output:'export'`），大量 Next 16 特性根本不适用**（无 Next 服务器）：SSR / Server Actions / `proxy.ts`（原 middleware）/ server route handlers / 服务端 caching（`revalidateTag`/`updateTag`/`cacheLife`/`cacheTag`/`connection()`）/ PPR（`cacheComponents`）/ Parallel routes——**都不要用**。运行时数据一律客户端从 `/joker-box/*` 拉。

写 Next 代码前，读 `node_modules/next/dist/docs/01-app/` 下对应指南；升级/弃用细节查 `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`（**以那里为准，别凭训练数据**）。以下只是本项目真正会撞上的几条：

- **Async request APIs**：`params` / `searchParams` 是 **Promise**，page/layout 里必须 `await`（同步访问运行时报错）。用全局生成的 `PageProps<'/route'>` / `LayoutProps` 类型助手（`npx next typegen` 重新生成），别手写。
- **`next lint` 已移除**：用 `npm run lint`（ESLint v9 flat config）；`next.config.*` 里的 `eslint` 键也没了。
- **Turbopack 是默认打包器**（dev 和 build 都是）：自定义 `webpack` 配置会让 build 失败。
- **dev 与 build 输出目录分离**（dev → `.next/dev`），可同时跑；`output:'export'` 下 dev 的 `rewrites` 会有告警但可用（生产由 nginx 反代）。
- **`next/image`**：项目当前**未使用**（只用后端运行时返回的品牌图 + `public/` 静态资源）。若要引入，注意 16 的收紧默认值（`localPatterns.search`、`minimumCacheTTL` 4h、`qualities` 仅 `[75]`、禁本地 IP、`remotePatterns` 替代 `domains`），先查文档再配。
- **运行时要求**：Node 20.9+、TS 5.1+；浏览器 Chrome/Edge/Firefox 111+ & Safari 16.4+。

---

## Conventions in this project

- **Fonts** use `next/font/google` (`Geist`, `Geist_Mono`, `Fraunces`, `IBM_Plex_Sans`, `Space_Mono`) exposing CSS variables wired into Tailwind via `@theme inline`. Prefer this over `<link>` font tags.
- **Styling / 多维主题系统** - Tailwind v4 utilities over a token system in `globals.css`. Two axes: **preset** (`data-theme` on `<html>`: `joker`/`panshi`/`hongtai`/`cyberpunk`/`minimal`) × **scheme** (`.dark`). 每套预设独立定义多维度 token（颜色/语义色/字体/圆角/阴影/字距/动效/间距/纹样），全部 `@theme inline` 映射，组件用 `rounded-*`/`shadow-*`/`bg-*`/`duration-*` 等自动跟随、**无需改组件**。**各维度取值与预设特效细节见 `app/README.md`**（token 以 `globals.css` 为准）。
  - `components/Container.tsx`：流式内容容器（`w-[85%] max-w-[1600px]`），`className` 可覆盖（如 jsonFormat 全宽用 `w-full max-w-none`）。
  - `components.json` + `lib/utils.ts` (`cn` = clsx+tailwind-merge) for shadcn/ui. `lib/theme` + `hooks/useTheme` manage scheme+preset (localStorage `theme` + `theme-preset`); inline script in root layout applies both before paint. `hooks/useTheme` returns typed `scheme`/`preset`.

## 通用坑（跨模块，别再踩）

- **Popover portal 在 Dialog 里滚轮被挡**：Dialog 的 react-remove-scroll 会拦截内部 Popover portal 的滚轮 -> 下拉面板改**内联绝对定位（不 portal）**（菜单管理 IconPicker、表单级联/多选控件）。需要滚轮时给容器加**非 passive 的 wheel listener**。
- **`react-hooks/static-components`**：渲染期动态拼的组件/map 渲染 JSX 会触发 -> 用**硬编码 switch**（菜单 `MenuIcon`）或静态 map。
- **Radix `SelectContent` 默认 `position="item-aligned"`**：仅禁用占位项/触发器在容器边缘时对齐跑飞 -> 用 `position="popper"` 锚定触发器正下方。
- **`react-hooks/set-state-in-effect`**：effect 里同步 `setState` 报错 -> 初始值在事件回调里置（如表单版本切换的 `switching` flag），effect 只在异步完成后清。
- **静态导出下 `router.push` 仅改 query 的软导航不可靠**（同 path 返回按钮偶发无效）-> 用 `window.history.pushState` + `popstate` 监听同步视图（ganDaShi / dynamicForm-manager）。
- **`.prose img` margin 特异性**：typography 给 `.prose img` 的 margin 特异性 (0,1,1) 高于 Tailwind utility -> 用更高特异性选择器在 `globals.css` 覆盖（见 ganDaShi 富文本）。
- **`crypto.randomUUID` 是 Secure-Context 限定**：仅 https/localhost 有；http 内网（nginx 部署）里 `crypto.randomUUID is not a function` -> 一律用 `@/lib/utils` 的 `randomId()`（内部已兜底时间戳+随机数）。流程节点 id 要 NCName 再去连字符。

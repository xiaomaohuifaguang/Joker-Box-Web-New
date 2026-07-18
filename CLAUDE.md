@AGENTS.md

# Joker Box

A study project built on `create-next-app` (App Router). The frontend is a **static export** (`output: 'export'`) served by nginx; it only renders pages and calls a separate backend API at runtime. The home page is a branding hero; feature pages are implemented incrementally (some are `ComingSoon` placeholders).

## Stack

- **Next.js 16.2.10** (App Router only - no `pages/`), **React 19.2.4**, **TypeScript 5** (strict), **Tailwind CSS v4** (via `@tailwindcss/postcss`; CSS-first config in `app/globals.css` - no `tailwind.config.*`).
- Path alias `@/*` -> project root. Import app code as `@/app/...`.
- ESLint v9 flat config. `next lint` is removed - use `npm run lint`.
- **Static export** (`output: 'export'`) -> `out/` for nginx. No SSR / Server Actions / `proxy.ts` / server route handlers; all runtime data is fetched client-side from `/joker-box/*` (dev: `next.config.ts` `rewrites`; prod: nginx).
- **Forms/validation**: `react-hook-form` + `zod` + `@hookform/resolvers/zod`.
- **UI kit**: shadcn/ui (`radix-ui`) in `components/ui/`, `lucide-react` icons, `sonner` toasts. In use: `NavigationMenu`, `Sidebar`, `Sheet`, `Collapsible`, `Tooltip`, `ContextMenu`, `Form`, `Table`, `Dialog`, `AlertDialog`, `Select`, `Sonner`.
- **Editors/parsers**: `@uiw/react-codemirror` + `@codemirror/lang-json` (JSON editor); `cronstrue` (cron→自然语言, zh_CN via `cronstrue/dist/cronstrue-i18n`) + `cron-parser` **v4** (cron 下次触发).

## Commands

```bash
npm run dev      # next dev  -> http://localhost:3000  (outputs to .next/dev)
npm run build    # next build  -> static export to out/ (also type-checks)
npm run start    # next start  (serve the production build)
npm run lint     # eslint   (NOTE: `next lint` no longer exists - see gotchas)
npx tsc --noEmit # type-check only, without building
```

## Project layout

```
app/
  layout.tsx            # Root layout (Server): html/body, fonts, <UserBootstrap>, <Toaster>, <TooltipProvider>
  loading.tsx / error.tsx / not-found.tsx   # Root loading / error / 404
  globals.css           # Tailwind + 多维主题 token（颜色/字体/圆角/阴影/字距/纹样 × 5 预设 × 明暗）
  (front)/              # Front route group (URL unaffected)
    layout.tsx          # Front layout (Server): Header + {children} + Footer
    loading.tsx / error.tsx
    page.tsx            # 首页 (Server, branding hero)
    website/page.tsx    # 收藏网站（分组卡片，/website/group）
    file-server/        # 码头（云盘）：双视图/排序/拖拽上传/右键菜单
      page.tsx + _components/ (FileCard, FileRow, FileMenuItems, NameDialog)
    tools/
      jsonFormat/page.tsx + _components/JsonTree   # JSON 编辑器 + 结构树（CodeMirror）
      cron/page.tsx                                 # cron 5 段 + 预设 + 描述 + 下次触发
      signInCard/page.tsx                           # 签到卡（占位）
    ganDaShi/page.tsx   # 干大事论坛（占位）
    code-maker/page.tsx # 代码生成器（占位）
    process/page.tsx    # 就酱审（占位）
    _components/        # Header (NavigationMenu + mobile Sheet), Footer, UserMenu
  login/page.tsx        # 登录 (client)
  register/page.tsx     # 注册 (client, react-hook-form + zod)
  test/{403,404}/page.tsx   # 渲染 ForbiddenPage/NotFoundPage（调试，公开）
  console/
    layout.tsx          # <RequireAdmin> + SidebarProvider(Sidebar + SidebarInset)；顶栏=SidebarTrigger+面包屑+主题/明暗
    loading.tsx / error.tsx
    page.tsx            # 仪表盘（占位）
    authority/org-manager/   # 机构管理（树+列表+CRUD，已实现）
      page.tsx + _components/ (OrgTreePanel, OrgListPanel, OrgFormDialog)
    authority/{user-manager,role-manager}/   # 占位
    api-manager / menu-manager / process-manager / website-manager /
    displayBoard / mail-manager / crawler-task-manager / form/dynamicForm-manager /
    ai/model-manager / system/{system-prompt,code-table}   # 占位
    _components/        # ConsoleSidebar (shadcn Sidebar, 折叠浮层, 用户菜单), ConsoleBreadcrumb
components/
  ui/                   # shadcn primitives
  RequireAuth.tsx       # 登录守卫 -> /login (client)
  RequirePermission.tsx # 登录 + authPaths 守卫 -> 403（非白名单页）
  RequireAdmin.tsx      # 登录 + admin 守卫 -> 404 (client)
  ErrorState.tsx        # 404/403 内容块
  NotFoundPage.tsx / ForbiddenPage.tsx   # 前台外壳 404/403
  ComingSoon.tsx        # 占位页 "敬请期待" (Server)
  UserBootstrap.tsx     # 登录态变化时拉取/清理用户信息 (client)
  ThemeSelect.tsx       # 主题预设切换（前台 Header / 后台顶栏共享）
lib/
  api/                  # client.ts (typed, auto-token) + auth, menu, org, file, website
  auth.ts               # Token in localStorage
  user.ts               # 当前用户缓存 (localStorage)
  credentials.ts        # 记住密码 (base64)
  error-pages.ts        # 403 文案 (FORBIDDEN_PROPS，ForbiddenPage + RequirePermission 共用)
  theme.ts              # scheme + preset
  utils.ts              # cn() 等
  env.ts                # NEXT_PUBLIC_* 占位
hooks/
  useAuth / useUser / useTheme / useMenuTree / useMounted / useCredentials
  useOrgTree / useOrgPage / useFileList / useWebsiteGroups
types/                  # ApiResponse<T>, Page<T>, User, Menu, Org/OrgTree/OrgDetail, FileItem, Website/WebsiteGroup
public/                 # 静态资源
next.config.ts          # output: 'export' + dev rewrites proxy /joker-box
```

App Router conventions: `app/layout.tsx` (root, required), `app/page.tsx` (route UI). Nested routes = folders with `page.tsx`; route-private components go in a sibling `_components/`.

## Project structure rules

Architecture: static export served by nginx; the frontend only renders pages and calls a separate backend API. No server-side logic. Many Next.js 16 features (SSR, Server Actions, `proxy`, server route handlers) **do not apply** under static export.

1. **Routing** - `app/` holds only route files. Keep route files thin; put route-specific components in a sibling `_components/` folder (underscore = excluded from routing).
2. **API address** - All backend calls go to relative `/joker-box/...` (root = `BASE_URL` in `lib/api/client.ts`). **Dev**: `next.config.ts` `rewrites` proxies `/joker-box/*` to the backend (same-origin, no CORS). **Prod**: nginx reverse-proxies. No `NEXT_PUBLIC_API_URL`.
3. **Data layer** - All backend calls go through `lib/api/` (typed wrappers returning `ApiResponse<T>`; business errors throw `ApiError` - destructure `.data`). No raw `fetch` in components **except** `lib/api/file.ts` 的上传（multipart）和下载（blob+token）--它们不能用 `api.post`（会设 JSON content-type / 拿不到 blob），直接 `fetch` + `getToken()`. Menus: `POST /menu/menuTree` (`lib/api/menu.ts` + `hooks/useMenuTree.ts`), filtered by `whiteList` + `authPaths`.
4. **Dynamic content** - Prefer `?id=` query params or client-side fetching. Dynamic `[param]` segments require `generateStaticParams` (must enumerate at build), usually impossible for backend data.
5. **Components** - Default to Server Components; add `'use client'` only for interactivity/state/effects/runtime data. Under static export, runtime data fetching is always client-side.
6. **Naming** - Component files PascalCase; hooks `useXxx.ts`; utils camelCase; folders kebab-case. One component per file.
7. **Imports** - Always use `@/`; no deep relative `../../`.
8. **Assets** - Static files in `public/`. Brand logos from the backend at runtime.
9. **Styling** - Tailwind utilities over tokens in `globals.css` `@theme`. Extract reused class combos into components, not scattered `@apply`.
10. **Types** - API/domain types in `types/`. Strict mode; avoid `any`. Sort/comparators 应对后端 null 字段做兜底（`?? ""`/`?? 0`）。

## Routing & auth

Two sections, unified login. Static export = no server-side route protection; the backend token check is the real boundary, the client guard is UX only.

- **Front** (`/`) - mostly public; wrapped by `app/(front)/layout.tsx` (Header + content + Footer). Header nav is backend-driven (see Menus). Login-only pages wrap in `<RequireAuth>` (e.g. `/file-server`); non-whitelist permission pages use `<RequirePermission>`; whitelist (public) pages use no guard (e.g. `/website`).
- **Console** (`/console/*`) - `<RequireAdmin>`: not logged in -> `/`; logged in but `admin !== true` -> 404 (`NotFoundPage`); else shadcn `Sidebar` app-shell (`SidebarProvider` + `Sidebar` + `SidebarInset`). 顶栏 = `SidebarTrigger` + `ConsoleBreadcrumb`（从菜单树+路由算路径链，纯文本不可点）+ 主题预设/明暗切换. Sidebar menu backend-driven; 折叠态父项点开向右浮层（DropdownMenu, `side="right"`）; footer 用户菜单（向上展开）= 用户信息 + 返回前台 + 退出登录.
- **Login** (`/login`) - posts `/auth/getToken`, stores token (`data` is the token string), redirects `?from=` (default `/`). 已登录被跳走. 记住密码 checkbox -> base64 localStorage. Inputs uncontrolled; autofill disabled.
- **Register** (`/register`) - `react-hook-form` + `zod` + shadcn `Form`. No auth redirect. Posts `/auth/register`; email code via `/auth/mailCode?mail=` (60s cooldown). zod: required + email format + password match (`refine` on `confirmPassword`); success -> `/login`.
- **Auth state** - `lib/auth.ts` token in localStorage (`auth_token`); `hooks/useAuth` reactive. `RequireAuth` redirects to `/login?from=<path>`.
- **API auth** - `lib/api/client.ts` auto-attaches `Authorization: Bearer <token>`.
- **Menus (backend-driven)** - Front Header + Console sidebar pull `POST /menu/menuTree?menuType=<-1|-2>` (`-1` console / `-2` front) via `hooks/useMenuTree.ts` (`lib/api/menu.ts`, `types/menu.ts`). `Menu = { path, name, children?, whiteList }`. Visibility: `whiteList==="1"` public (visible logged-out); else needs `path` in `user.authPaths` (parents survive if any child visible). Module-level cache keyed by `menuType + authed + userId` (multiple Header instances share one fetch; re-fetch on login/logout/user switch). 首页 hardcoded first in front nav (logo also links home); API `path:"/"` de-duped. Console icons client-mapped by path (`MENU_ICONS`) with fallback.
- **404 / 403** - Unmatched routes -> `app/not-found.tsx` -> `NotFoundPage`. `ForbiddenPage` is the 403 counterpart (`FORBIDDEN_PROPS` in `lib/error-pages.ts`, shared with `RequirePermission`). `/test/403` + `/test/404` render these for debugging (public). `RequirePermission`: not logged in -> `/`; logged in but not in `authPaths` -> 403; else render. Whitelist pages no guard. Guards use `useMounted` to skip the first frame (token is client-only) so a logged-in refresh stays put.
- **Loading / error boundaries** - `loading.tsx` + `error.tsx` per segment (`app/`, `app/(front)/`, `app/console/`). Per-segment so chrome stays during load/error. `error.tsx` is client with `reset`.
- **Toasts** - `sonner` `<Toaster/>` in `app/layout.tsx`; `components/ui/sonner.tsx` reads project `useTheme` (`scheme`), not `next-themes` (no ThemeProvider). `import { toast } from "sonner"`.
- **Mobile nav** - Front Header hides desktop nav under `md:` + hamburger -> `Sheet` (nav + theme + auth). Console sidebar auto-`Sheet` drawer on mobile (`useIsMobile`).

## Feature pages (implemented)

- **机构管理** `/console/authority/org-manager` - 左机构树（后端虚拟根 id=-1「全部」为第一层单节点）+ 右列表（表格+分页页码+省略号+搜索）。CRUD：新增/编辑（`OrgFormDialog`，父级 Select）、删除（AlertDialog）。`/org/*` 接口（query/getOrgTree 返回单根，取 `[data]`）。增删改后刷新树+列表（`refreshKey`）。
- **JSON 格式化** `/tools/jsonFormat` - CodeMirror 编辑器（JSON 高亮+校验，主题随 scheme）+ 自写 `JsonTree`（可折叠，类型色）+ 格式化/压缩/复制。
- **cron** `/tools/cron` - 5 段输入（分时日月周）+ 常用预设 + `cronstrue` 中文描述 + `cron-parser` 下次 5 次触发（`date-fns` 格式化，zhCN 星期）。
- **收藏网站** `/website` - `/website/group` 分组，每组 brand 方块标记 + 卡片网格（hover 浮起 + 域名 mono）。
- **码头（云盘）** `/file-server`（`<RequireAuth>`）- 双视图（卡片/列表）+ 排序（名称/大小/时间，文件夹置顶）+ 拖拽上传（浮层）+ 右键菜单（项: 打开/下载/重命名/删除；空白区: 上传/新建）+ 面包屑导航。`/file/*`：list/createFolder/delete/rename 走 query 参数；upload 走 multipart（自定义 fetch）；download 走 GET blob+token（触发浏览器下载）。

## ⚠️ Next.js 16 is NOT the Next.js in your training data

This is the single most important thing to know. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/01-app/01-getting-started/`. Deprecations and breaking changes below are taken from `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` - verify there if unsure.

### Async request APIs (breaking - sync access fully removed)

`cookies()`, `headers()`, `draftMode()`, and the `params` / `searchParams` props on pages/layouts/routes/metadata files are **Promises**. You must `await` them - synchronous access errors at runtime.

```tsx
// page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params          // await!
  const query = await props.searchParams       // await!
  return <h1>{slug}</h1>
}
```

`PageProps<'/route'>`, `LayoutProps`, and `RouteContext` are globally-available generated type helpers (regenerate with `npx next typegen`). Use them instead of hand-typing params.

### Middleware is now "Proxy"

`middleware.ts` -> **`proxy.ts`** (project root, or `src/` if used). The named export `middleware` -> **`proxy`**. The `edge` runtime is **not** supported in `proxy` - it runs on `nodejs` and can't be changed (keep `middleware.ts` if you need edge). Config flags renamed too: `skipMiddlewareUrlNormalize` -> `skipProxyUrlNormalize`.

### Turbopack is the default bundler (dev AND build)

No `--turbopack` flag needed. A **custom `webpack` config will fail the build** - either migrate it to Turbopack, run `next build --turbopack` to ignore it, or opt out with `next build --webpack`. Turbopack config moved from `experimental.turbopack` to top-level `turbopack`.

### `next lint` is removed

Use ESLint directly (`npm run lint`). `next build` no longer lints, and the `eslint` key in `next.config.*` is gone.

### Caching APIs changed

- `revalidateTag('x')` now **requires a second `cacheLife` arg**: `revalidateTag('posts', 'max')`. Single-arg form is a type error.
- **`updateTag(tag)`** is new - Server-Action-only, gives read-your-writes (immediate refresh). Use it (not `revalidateTag`) when the user should see their own change instantly.
- **`refresh()`** (from `next/cache`) refreshes the client router inside a Server Action.
- `cacheLife` and `cacheTag` are stable - drop the `unstable_` prefix.

### Removed / deprecated config & features

- `serverRuntimeConfig` / `publicRuntimeConfig` / `next/config` `getConfig()` - **removed**. Use env vars directly; prefix client-visible ones with `NEXT_PUBLIC_`. To read env vars at *runtime* (not build), `await connection()` from `next/server` first.
- AMP support (`next/amp`, `export const config = { amp: true }`, `amp` config) - **removed**.
- `experimental.ppr` / `experimental_ppr` segment config - **removed**. Opt into Partial Prerendering via top-level `cacheComponents: true` (also replaces `experimental.dynamicIO` and `experimental.useCache`).
- `experimental.turbopack`, `devIndicators` sub-options (`appIsrStatus`, `buildActivity`, `buildActivityPosition`), `unstable_rootParams` - removed.
- React Compiler is stable: `reactCompiler: true` in config (needs `babel-plugin-react-compiler` installed; not enabled by default).

### `next/image` defaults tightened (breaking)

- Local image `src` with a query string now requires an `images.localPatterns` entry with `search` (prevents enumeration).
- `images.minimumCacheTTL` default 60s -> **4 hours**.
- `16` removed from default `imageSizes`; `qualities` default is now `[75]` only (other `quality` props get coerced to the closest allowed).
- Local IPs blocked by default -> `images.dangerouslyAllowLocalIP: true` (private networks only).
- `images.maximumRedirects` default is now 3.
- `next/legacy/image` and `images.domains` are deprecated -> use `next/image` and `images.remotePatterns`.

### Routing & layout changes

- **Parallel route slots now require an explicit `default.js`** - builds fail without one (`notFound()` or `return null`).
- `next dev` and `next build` use separate output dirs (dev -> `.next/dev`) and can run concurrently; a lockfile prevents duplicate instances of each.
- Next.js no longer overrides `scroll-behavior: smooth` during navigation. Add `data-scroll-behavior="smooth"` on `<html>` to restore the old behavior.
- `next build` output no longer shows `size` / `First Load JS` metrics - use Lighthouse / Vercel Analytics instead.

### Runtime requirements

Node.js 20.9+ (18 unsupported), TypeScript 5.1+, browsers Chrome/Edge/Firefox 111+ & Safari 16.4+.

---

## Conventions in this project

- **Fonts** use `next/font/google` (`Geist`, `Geist_Mono`, `Fraunces`, `IBM_Plex_Sans`, `Space_Mono`) exposing CSS variables wired into Tailwind via `@theme inline`. Prefer this over `<link>` font tags.
- **Images** use `next/image` (see breaking-change notes above before configuring remote/local patterns).
- **Styling / 多维主题系统** - Tailwind v4 utilities over a token system in `globals.css`. Two axes: **preset** (`data-theme` on `<html>`: `joker`/`panshi`/`hongtai`/`cyberpunk`/`minimal`) × **scheme** (`.dark`). 每套预设**独立定义多维度 token**（不止颜色）：
  - 颜色：`background/foreground/surface/muted-foreground/border/brand/felt` + shadcn tokens (`card/popover/primary/secondary/muted/accent/destructive/input/ring/sidebar*`) 映射到这些。
  - 字体：`--display-font/--body-font/--mono-font`（Joker=Fraunces+Geist, Panshi/Hongtai=IBM Plex Sans, Cyberpunk=全 Space Mono, Minimal=Geist）。
  - 圆角：`--radius` 基准 -> `@theme inline` 映射 `--radius-sm/md/lg/xl`（系数 0.25/0.5/1/1.5），`rounded-*` 跟随。Joker 0.25rem（锐）、Panshi/Hongtai 0.5rem（= Tailwind 默认，不变）、Cyberpunk 0（全直角）、Minimal 0.75rem（软）。
  - 阴影：`--elevation-sm/md/lg` -> `--shadow-sm/md/lg`，`shadow-*` 跟随。Cyberpunk 用 `color-mix` 霓虹辉光；Minimal 几乎无阴影（flat）。
  - 字距：`--tracking-display`（base 层 h1-h4 `letter-spacing`）。Cyberpunk 宽、Minimal 紧。
  - 纹样（淡）：Joker 菱形、Cyberpunk 扫描线、Minimal 点阵（`body` 背景）。
  - 全部 token 在 `@theme inline` 映射，组件用 `rounded-*`/`shadow-*`/`bg-*` 等自动跟随预设，无需改组件。
  - Brand signature: 扑克牌角标（`J` + ♠）logo mark；♠ 用 `--brand`（与 shadcn `--accent` 区分）。
  - `components.json` + `lib/utils.ts` (`cn` = clsx+tailwind-merge) for shadcn/ui. `lib/theme` + `hooks/useTheme` manage scheme+preset (localStorage `theme` + `theme-preset`); inline script in root layout applies both before paint. `hooks/useTheme` returns typed `scheme`/`preset`.

@AGENTS.md

# react-study

A study project built on `create-next-app` (App Router). The frontend is a **static export** (`output: 'export'`) served by nginx; it only renders pages and calls a separate backend API at runtime. The home page is intentionally blank - content/logos come from the backend later.

## Stack

- **Next.js 16.2.10** (App Router only - no `pages/`), **React 19.2.4**, **TypeScript 5** (strict), **Tailwind CSS v4** (via `@tailwindcss/postcss`, configured in `postcss.config.mjs` - there is no `tailwind.config.*` file; v4 uses CSS-first config in `app/globals.css` with `@import "tailwindcss"` + `@theme inline`).
- Path alias: `@/*` -> project root (`./*`). Import app code as `@/app/...`.
- ESLint v9 **flat config** (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `/typescript`.
- **Static export** (`output: 'export'` in `next.config.ts`) -> `next build` emits static HTML to `out/` for nginx. No SSR, Server Actions, `proxy.ts`, or server-side route handlers; all runtime data is fetched client-side from the backend at `/joker-box/*` (dev: proxied via `next.config.ts` `rewrites`; prod: via nginx).

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
  layout.tsx            # Root layout (Server): html/body, fonts
  not-found.tsx         # Global 404 (front chrome + 404 content)
  globals.css           # Tailwind import + theme tokens
  (front)/              # Front route group (URL unaffected)
    layout.tsx          # Front layout (Server): Header + {children} + Footer
    page.tsx            # Front home "/"
    website/page.tsx    # 收藏网站 (nav gated by authPaths)
    _components/        # Front-private components (Header, Footer, UserMenu, ThemeSelect)
  login/page.tsx        # Unified login (client)
  register/page.tsx     # Register (client; no auth redirect, URL-accessible)
  console/
    layout.tsx          # Console layout (client): <RequireAdmin> + app-shell (ConsoleSidebar + main)
    page.tsx            # Dashboard
    _components/        # Console-private components (ConsoleSidebar)
components/
  ui/                   # Primitive components
  RequireAuth.tsx       # Login guard (client)
  RequirePermission.tsx # Login + authPaths guard -> 403 (client)
  RequireAdmin.tsx      # Login + admin guard -> 404 (client)
  ErrorState.tsx        # 404/403 content block
  NotFoundPage.tsx      # Front-chrome 404 (Header + ErrorState + Footer)
  UserBootstrap.tsx     # Fetches/clears user info on login/logout (client)
lib/
  api/                  # Typed backend client (auto-attaches bearer token)
    auth.ts             # Auth endpoints: login, getUserInfo, register, sendMailCode
  auth.ts               # Token in localStorage (get/set/clear/isLoggedIn)
  user.ts               # Current user in localStorage (get/set/clear/fetch)
  credentials.ts        # Remembered login creds (base64 localStorage)
  theme.ts              # dark/light theme (get/set/toggle)
  utils.ts              # cn() and helpers
  env.ts                # Placeholder for future NEXT_PUBLIC_* vars
hooks/
  useAuth.ts            # Reactive login state
  useUser.ts            # Reactive current user
  useTheme.ts           # Reactive theme
  useMounted.ts         # Client-mounted flag (avoid first-frame auth misjudgment)
  useCredentials.ts     # Reactive remembered credentials
types/                  # Shared TS types (ApiResponse<T>, User, domain)
public/                 # Static assets only
next.config.ts          # output: 'export' + dev rewrites proxy /joker-box
```

App Router conventions: `app/layout.tsx` (root layout, required), `app/page.tsx` (route UI). Add nested routes as folders under `app/` with their own `page.tsx`; route-private components go in a sibling `_components/` folder.

## Project structure rules

Architecture: static export (`output: 'export'`) served by nginx; the frontend only renders pages and calls a separate backend API. No server-side logic. Many Next.js 16 features below (SSR, Server Actions, `proxy`, server route handlers) **do not apply** under static export.

1. **Routing** - `app/` holds only route files (`page/layout/error/not-found.tsx`, etc.). Keep route files thin; put route-specific components in a sibling `_components/` folder (underscore = excluded from routing).
2. **API address** - All backend calls go to relative `/joker-box/...` (root path = `BASE_URL` in `lib/api/client.ts`; backend root is `joker-box`). **Development**: `next.config.ts` `rewrites` proxies `/joker-box/*` to the backend (same-origin, no CORS, dev-only). **Production**: static export has no Next server so `rewrites` don't apply - nginx reverse-proxies `/joker-box/*` to the backend. No `NEXT_PUBLIC_API_URL` needed.
3. **Data layer** - All backend calls go through `lib/api/` (typed wrappers returning the full `ApiResponse<T>`; business errors throw `ApiError` - destructure `.data` for the payload). No raw `fetch` in components. Runtime data is fetched in client components; build-time data (if any) in Server Components.
4. **Dynamic content** - Prefer `?id=` query params or client-side fetching for dynamic data. Dynamic `[param]` route segments require `generateStaticParams` (must enumerate all paths at build time), which usually isn't possible for backend data.
5. **Components** - Default to Server Components; add `'use client'` only for interactivity, state, effects, or runtime data. Under static export, runtime data fetching is always client-side.
6. **Naming** - Component files PascalCase (`Button.tsx`); hooks `useXxx.ts`; utils camelCase; folders kebab-case. One component per file.
7. **Imports** - Always use the `@/` alias; no deep relative `../../` climbing.
8. **Assets** - Static files go in `public/` (referenced as `/file.ext`). Brand logos load from the backend at runtime - don't commit them here.
9. **Styling** - Tailwind utility classes; theme tokens centralized in `globals.css` `@theme`. Extract reused class combos into components rather than scattering `@apply`.
10. **Types** - API/domain types live in `types/`. Strict mode is on; avoid `any`.

## Routing & auth

Two sections with unified login. Static export = no server-side route protection; the backend token check is the real security boundary, the client guard is UX only.

- **Front** (`/`) - mostly public; wrapped by `app/(front)/layout.tsx` (Header + content + Footer); login-only pages wrap content in `<RequireAuth>`, permission-gated pages (authPaths) use `<RequirePermission>`.
- **Console** (`/console/*`) - guarded by `app/console/layout.tsx` via `<RequireAdmin>`: not logged in -> `/` (front home, login via header); logged in but `admin !== true` -> 404 (`NotFoundPage`); else collapsible sidebar (logo / menu / user+logout) + main. Logout clears token -> RequireAdmin sends to `/`.
- **Login** (`/login`) - unified login page (client). Posts to `/auth/getToken`, stores the returned token (the `data` field is the token string) via `setToken`, redirects to `?from=` (default `/`). Already-authenticated users are redirected away (can't reach `/login` while logged in). Has a 记住密码 checkbox: checked -> save `{username,password}` base64 to localStorage (`lib/credentials.ts`); unchecked + same account -> clear. Inputs uncontrolled (`defaultValue` from saved creds); browser autofill disabled (`autoComplete="off"`/`"new-password"`).
- **Register** (`/register`) - register page (client). No auth redirect (URL-accessible even when logged in); the 注册 button (header + login page) is hidden when logged in. Posts `/auth/register` `{username,password,nickname,mail,code,sex,phone?}`; email code via `/auth/mailCode?mail=`. Password-confirm validation; on success -> `/login`.
- **Auth state** - `lib/auth.ts` stores the token in `localStorage` (key `auth_token`): `getToken/setToken/clearToken/isLoggedIn`. `hooks/useAuth.ts` exposes reactive login state. `components/RequireAuth.tsx` redirects unauthenticated users to `/login?from=<path>`.
- **API auth** - `lib/api/client.ts` auto-attaches `Authorization: Bearer <token>` when a token is present.
- **Menu visibility** - `authNavItems` (front Header) supports flat items and parent+submenu groups (hover parent to open submenu). An item renders only when permitted by the logged-in user's `authPaths`: a flat item needs its own route; a parent renders if any child route is permitted (children filtered individually). e.g. 收藏网站 `/website`, 工具箱 `/tools` → `/tools/cron` / `/tools/jsonFormat`.
- **Dynamic console pages** - use `?id=` query params (e.g. `/console/users/detail?id=…`), not `[id]` segments (static export can't enumerate backend IDs at build time).
- **404 / 403** - Unmatched routes (any login state) hit `app/not-found.tsx` (front chrome + 404 via `ErrorState`). Permission-gated front pages use `<RequirePermission>`: not logged in -> redirect `/` (home; login via header button, never auto-`/login`); logged in but route not in `user.authPaths` -> 403 (`ErrorState`); else render. See `/website`. Guards (`RequirePermission`/`RequireAdmin`) + login page use `useMounted` (`hooks/useMounted.ts`) to skip the first frame (token is client-only, `authenticated` is `false` pre-hydration) so a logged-in refresh of a protected page stays on it (no flash, no redirect); judgment happens only after mount.

---

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

- **Fonts** use `next/font/google` (`Geist`, `Geist_Mono`) exposing CSS variables (`--font-geist-sans`, `--font-geist-mono`) wired into Tailwind via `@theme inline` in `globals.css`. Prefer this over adding `<link>` font tags.
- **Images** use `next/image` (see breaking-change notes above before configuring remote/local patterns).
- **Styling / design system** — Tailwind v4 utility classes over a token system in `globals.css`: colors `background/foreground/surface/muted-foreground/border/brand/felt` plus shadcn tokens (`card/popover/primary/secondary/muted/accent/destructive/input/ring`) mapped to these. Two axes: **preset** (`data-theme` on `<html>`: `joker`/`panshi`/`hongtai`/`cyberpunk`/`minimal`) × **scheme** (`.dark`); each preset defines its own light + dark + fonts. Per-preset fonts: Joker=Fraunces, Gov(blue/red)=IBM Plex Sans, Cyberpunk=Space Mono, Minimal/default body=Geist; each preset sets `--display-font/--body-font/--mono-font`. Signature motifs (faint body bg): Joker harlequin diamonds, Cyberpunk scanlines. Brand signature: a playing-card corner index (`J` + ♠) logo mark; ♠ uses `--brand` (joker red, kept separate from shadcn's `--accent` hover-bg to avoid the name clash) so it adapts per preset. `components.json` + `lib/utils.ts` (`cn` = clsx+tailwind-merge) are set up for shadcn/ui (hybrid: hand-write simple components, use shadcn for complex interactive ones, restyle to these tokens). `lib/theme` + `hooks/useTheme` manage scheme+preset (localStorage `theme` + `theme-preset`); inline script in root layout applies both before paint.

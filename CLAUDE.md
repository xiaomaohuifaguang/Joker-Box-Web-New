@AGENTS.md

# react-study

A fresh `create-next-app` starter (App Router) being used as a study project. Currently just the default landing page — no custom routes, data fetching, or API yet.

## Stack

- **Next.js 16.2.10** (App Router only — no `pages/`), **React 19.2.4**, **TypeScript 5** (strict), **Tailwind CSS v4** (via `@tailwindcss/postcss`, configured in `postcss.config.mjs` — there is no `tailwind.config.*` file; v4 uses CSS-first config in `app/globals.css` with `@import "tailwindcss"` + `@theme inline`).
- Path alias: `@/*` → project root (`./*`). Import app code as `@/app/...`.
- ESLint v9 **flat config** (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + `/typescript`.

## Commands

```bash
npm run dev      # next dev  → http://localhost:3000  (outputs to .next/dev)
npm run build    # next build  (production build; also runs type checking)
npm run start    # next start  (serve the production build)
npm run lint     # eslint   (NOTE: `next lint` no longer exists — see gotchas)
npx tsc --noEmit # type-check only, without building
```

## Project layout

```
app/
  layout.tsx     # Root layout: <html>/<body>, Geist fonts, global metadata
  page.tsx       # Home route ("/") — the default starter UI
  globals.css    # Tailwind import + theme tokens (--color-background, etc.)
  favicon.ico
public/          # Static assets served at root (next.svg, vercel.svg, ...)
next.config.ts   # Empty NextConfig — no custom config yet
```

App Router conventions: `app/layout.tsx` (root layout, required), `app/page.tsx` (route UI). Add nested routes as folders under `app/` with their own `page.tsx`.

---

## ⚠️ Next.js 16 is NOT the Next.js in your training data

This is the single most important thing to know. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/01-app/01-getting-started/`. Deprecations and breaking changes below are taken from `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — verify there if unsure.

### Async request APIs (breaking — sync access fully removed)

`cookies()`, `headers()`, `draftMode()`, and the `params` / `searchParams` props on pages/layouts/routes/metadata files are **Promises**. You must `await` them — synchronous access errors at runtime.

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

`middleware.ts` → **`proxy.ts`** (project root, or `src/` if used). The named export `middleware` → **`proxy`**. The `edge` runtime is **not** supported in `proxy` — it runs on `nodejs` and can't be changed (keep `middleware.ts` if you need edge). Config flags renamed too: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.

### Turbopack is the default bundler (dev AND build)

No `--turbopack` flag needed. A **custom `webpack` config will fail the build** — either migrate it to Turbopack, run `next build --turbopack` to ignore it, or opt out with `next build --webpack`. Turbopack config moved from `experimental.turbopack` to top-level `turbopack`.

### `next lint` is removed

Use ESLint directly (`npm run lint`). `next build` no longer lints, and the `eslint` key in `next.config.*` is gone.

### Caching APIs changed

- `revalidateTag('x')` now **requires a second `cacheLife` arg**: `revalidateTag('posts', 'max')`. Single-arg form is a type error.
- **`updateTag(tag)`** is new — Server-Action-only, gives read-your-writes (immediate refresh). Use it (not `revalidateTag`) when the user should see their own change instantly.
- **`refresh()`** (from `next/cache`) refreshes the client router inside a Server Action.
- `cacheLife` and `cacheTag` are stable — drop the `unstable_` prefix.

### Removed / deprecated config & features

- `serverRuntimeConfig` / `publicRuntimeConfig` / `next/config` `getConfig()` — **removed**. Use env vars directly; prefix client-visible ones with `NEXT_PUBLIC_`. To read env vars at *runtime* (not build), `await connection()` from `next/server` first.
- AMP support (`next/amp`, `export const config = { amp: true }`, `amp` config) — **removed**.
- `experimental.ppr` / `experimental_ppr` segment config — **removed**. Opt into Partial Prerendering via top-level `cacheComponents: true` (also replaces `experimental.dynamicIO` and `experimental.useCache`).
- `experimental.turbopack`, `devIndicators` sub-options (`appIsrStatus`, `buildActivity`, `buildActivityPosition`), `unstable_rootParams` — removed.
- React Compiler is stable: `reactCompiler: true` in config (needs `babel-plugin-react-compiler` installed; not enabled by default).

### `next/image` defaults tightened (breaking)

- Local image `src` with a query string now requires an `images.localPatterns` entry with `search` (prevents enumeration).
- `images.minimumCacheTTL` default 60s → **4 hours**.
- `16` removed from default `imageSizes`; `qualities` default is now `[75]` only (other `quality` props get coerced to the closest allowed).
- Local IPs blocked by default → `images.dangerouslyAllowLocalIP: true` (private networks only).
- `images.maximumRedirects` default is now 3.
- `next/legacy/image` and `images.domains` are deprecated → use `next/image` and `images.remotePatterns`.

### Routing & layout changes

- **Parallel route slots now require an explicit `default.js`** — builds fail without one (`notFound()` or `return null`).
- `next dev` and `next build` use separate output dirs (dev → `.next/dev`) and can run concurrently; a lockfile prevents duplicate instances of each.
- Next.js no longer overrides `scroll-behavior: smooth` during navigation. Add `data-scroll-behavior="smooth"` on `<html>` to restore the old behavior.
- `next build` output no longer shows `size` / `First Load JS` metrics — use Lighthouse / Vercel Analytics instead.

### Runtime requirements

Node.js 20.9+ (18 unsupported), TypeScript 5.1+, browsers Chrome/Edge/Firefox 111+ & Safari 16.4+.

---

## Conventions in this project

- **Server Components by default.** `app/page.tsx` and `app/layout.tsx` are Server Components. Add `'use client'` at the top of a file only when you need hooks, state, event handlers, or browser APIs. Server Components can be `async` and `await` data directly.
- **Fonts** use `next/font/google` (`Geist`, `Geist_Mono`) exposing CSS variables (`--font-geist-sans`, `--font-geist-mono`) wired into Tailwind via `@theme inline` in `globals.css`. Prefer this over adding `<link>` font tags.
- **Images** use `next/image` (see breaking-change notes above before configuring remote/local patterns).
- **Styling** is Tailwind v4 utility classes; theme tokens (`--color-background`, `--color-foreground`, `--font-sans`, `--font-mono`) are defined in `globals.css`. Dark mode keys off `prefers-color-scheme`.

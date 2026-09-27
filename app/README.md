# app — 路由根 & 全局样式/主题

`layout.tsx`(root, Server)：html/body、`next/font` 字体变量、`<UserBootstrap>`、`<Toaster>`、`<TooltipProvider>`，内联脚本在首帧前应用 theme(preset+scheme)。`loading/error/not-found.tsx` 根边界；`globals.css` 是 Tailwind v4 CSS-first 入口，实际内容拆在 `app/styles/`。

## 多维主题系统（`app/styles/`，契约见 `app/styles/README.md`）

两个轴：**preset**(`<html data-theme>`，11 套：`joker`(默认)/`ocean`/`sunset`/`forest`/`minimal`/`golden`/`arctic`/`rose`/`tech`/`botanical`/`midnight`) × **scheme**(`.dark`)。一套主题一个文件 `styles/themes/<id>.css`，id 与 `lib/theme.ts` `PRESETS[].id` 一一对应；`globals.css` 只按序 `@import`。

- **token 维度**：颜色 7（`background/foreground/surface/muted-foreground/border/brand/brand-2`）+ 语义色 4 + 字体 3 + 圆角/阴影分量/字距/动效/间距，全部在 `styles/tokens.css` 的 `@theme inline` 映射，组件用 `rounded-*`/`shadow-*`/`bg-*`/`duration-*` 等工具类自动跟随、**无需改组件**。
- **阴影**：`tokens.css` 统一公式从 6 分量派生 `--elevation-2xs..2xl`；主题只填分量，特殊阴影（辉光/flat）才在主题文件里覆盖档位。
- **语义色**：`--success/--warning/--error/--info` 每套独立(light+dark) → `bg-success`/`text-error` 等 + sonner 类型色。
- **纹样/专属特效**：仅 joker 有（黑金剧场：harlequin 菱格金线、浮层烫金边、curtain-rise 幕布入场、button 浮起/危险抖动微动效）；其余 10 套首批只做 token + `::selection`，可按契约后续追加。

**Brand signature**：品牌牌面是**大王（Joker 牌），不是 Jack**——标记无花色（不用 ♠♥♣♦）。logo = `components/LogoMark.tsx`（迷你牌面 + `components/JesterHat.tsx` 小丑帽 SVG，帽身 currentColor、铃铛固定 `--brand-2` 点睛红），Header/ConsoleSidebar/首页 hero/登录注册页共用；favicon 同图形（`app/icon.svg` + `app/favicon.ico`，透明底金帽红铃）。登录/注册页走黑金剧场气质：harlequin 菱格舞台 + 烫金内框 + 小丑帽 emblem，表单为安静单栏（无牌面装扮）。

主题管理：`lib/theme.ts` + `hooks/useTheme`(scheme+preset，localStorage `theme`/`theme-preset`；废弃 preset id 自动回退 joker)。字体用 `next/font/google`(Geist/Geist_Mono/Fraunces)暴露 CSS 变量接入 `@theme inline`。

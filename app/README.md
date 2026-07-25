# app — 路由根 & 全局样式/主题

`layout.tsx`(root, Server)：html/body、`next/font` 字体变量、`<UserBootstrap>`、`<Toaster>`、`<TooltipProvider>`，内联脚本在首帧前应用 theme(preset+scheme)。`loading/error/not-found.tsx` 根边界；`globals.css` 是 Tailwind v4 CSS-first 配置 + 主题 token 唯一来源。

## 多维主题系统（`globals.css`）

两个轴：**preset**(`<html data-theme>`：`joker`/`panshi`/`hongtai`/`cyberpunk`/`minimal`) × **scheme**(`.dark`)。每套预设**独立定义多维度 token**，全部在 `@theme inline` 映射，组件用 `rounded-*`/`shadow-*`/`bg-*`/`duration-*`/`ease-*` 等工具类自动跟随、**无需改组件**。

- **颜色**：`background/foreground/surface/muted-foreground/border/brand/felt` + shadcn tokens(`card/popover/primary/secondary/muted/accent/destructive/input/ring/sidebar*`)映射到这些。
- **语义色**：`--success/--warning/--error/--info` 每套独立(light+dark)，`@theme inline` → `bg-success`/`text-error` 等 + sonner 类型色。Joker error=brand 红、Cyberpunk error=品红/info=电青、Minimal info=brand 蓝。
- **字体**：`--display-font/--body-font/--mono-font`（Joker=Fraunces+Geist、Panshi/Hongtai=IBM Plex Sans、Cyberpunk=全 Space Mono、Minimal=Geist）。
- **圆角**：`--radius` 基准 → `--radius-sm/md/lg/xl`(系数 0.25/0.5/1/1.5)。Joker 0.25rem、Panshi/Hongtai 0.5rem、Cyberpunk 0、Minimal 1rem。
- **阴影**：`--elevation-sm/md/lg` → `--shadow-*`。Cyberpunk 用 `color-mix` 霓虹辉光；Minimal 无阴影(flat)。
- **字距**：`--tracking-display`(base 层 h1-h4)。Joker -0.05em、Cyberpunk 0.05em、Minimal -0.02em。
- **动效**：`--motion-duration`+`--motion-ease` → `--duration-*`+`--ease-in-out`。Joker 200ms 弹性 `cubic-bezier(0.18,1.8,0.4,1)`、Cyberpunk 80ms `steps(2,end)`、Minimal 300ms `cubic-bezier(0.16,1,0.3,1)`。
- **间距**：`--space-unit` → `--spacing`，所有 `p-*/m-*/gap-*/w-*/h-*` 跟随。Cyberpunk 0.22rem、Minimal 0.34rem、其余 0.25rem。
- **纹样**：Joker 菱形、Cyberpunk 扫描线(15% alpha `color-mix(var(--felt))`)、Minimal 点阵。画在 `body` + `.bg-background` + `.bg-surface` + `.bg-sidebar` + `.bg-popover` + `[data-slot="navigation-menu-content"]` 上(全局覆盖)。

**预设专属特效**(unlayered CSS，仅该预设生效)：
- **Joker**：`@keyframes curtain-rise` 幕布入场(Dialog/Dropdown/Popover 等 `data-state="open"`)；`::selection` 小丑红+骨白；`.border` 2px(版画感)。
- **Cyberpunk**：`@keyframes cyberpunk-glitch` 故障动画(Button hover 持续 + h1/h2/logo 入场 3 次)；`clip-path` 双斜切角；Button hover `filter:drop-shadow` 霓虹；`button/a/label` 全大写；全局 `cursor:crosshair`(输入区例外)；`body` 字距 0.05em。
- **Minimal**：去边框(`.border`→0，输入框 `:not(input)` 保留 + focus 亮 `--brand`)；h1-h4 800 / body 400 字重对比；hover 去位移(`transform:none`)。

**Brand signature**：扑克牌角标(`J` + ♠) logo mark；♠ 用 `--brand`(与 shadcn `--accent` 区分)；logo 文字带 `data-slot="logo-text"`(Cyberpunk glitch 用)。

主题管理：`lib/theme.ts` + `hooks/useTheme`(scheme+preset，localStorage `theme`/`theme-preset`)。字体用 `next/font/google`(Geist/Geist_Mono/Fraunces/IBM_Plex_Sans/Space_Mono)暴露 CSS 变量接入 `@theme inline`。

# styles — 主题契约 & 全局样式拆分

`app/globals.css` 只是入口（tailwind 导入 + 按序 `@import` 本目录）。Tailwind v4 的 `@import` 构建期合并，拆分运行时零成本。

## 文件职责

- `tokens.css` — `@custom-variant dark` + **阴影统一派生公式**（全主题唯一一份）+ `@theme inline` 映射（自有 token → shadcn/工具类）。
- `base.css` — `@layer base`：token 到元素默认样式的挂接（body/h1-h4/全局 border-color）。
- `themes/<id>.css` — 一套主题一个文件，`<id>` 必须等于 `lib/theme.ts` 里 `PRESETS[].id`。
- `features/*.css` — 功能样式（tiptap/flow/ai-markdown），与主题无关，颜色一律走 token。

## 主题文件契约

每个主题文件自包含，固定三段（后两段可空，留空则删段标题）：

```css
/* ===== ① token ===== */
:root[data-theme="<id>"] { ...完整浅色 token... }
:root[data-theme="<id>"].dark { ...仅 11 个颜色 token... }

/* ===== ② 纹样 =====（可选） */
/* ===== ③ 专属特效 =====（可选；至少含 ::selection） */
```

**必填 token**（浅色块全填；暗色块只覆盖 11 个颜色，其余继承浅色）：

| 维度 | token |
|---|---|
| 颜色 ×7 | `--background --foreground --surface --muted-foreground --border --brand --brand-2` |
| 语义色 ×4 | `--success --warning --error --info` |
| 字体 ×3 | `--display-font --body-font --mono-font`（取值限 `--font-geist-sans / --font-fraunces / --font-geist-mono`，新增字体先在 `app/layout.tsx` 挂 next/font） |
| 形状 | `--radius` |
| 阴影分量 ×6 | `--shadow-x --shadow-y --shadow-blur --shadow-spread --shadow-opacity --shadow-color`（color 是 oklch 分量三段，不带 `oklch()`） |
| 字距 ×2 | `--tracking-display --tracking-normal` |
| 动效 ×2 | `--motion-duration --motion-ease` |
| 间距 | `--space-unit` |
| 特效 | `::selection`（`background: var(--brand); color: var(--background);`） |

**阴影**：不要在主题文件里手写 `--elevation-*`——`tokens.css` 用 6 分量统一派生 7 档（自定义属性同元素特异性覆盖，`:root[data-theme]` > `:root`，var() 自动取覆盖后的值）。确需特殊阴影（辉光/flat）才在自己文件里显式覆盖对应档位。

**配色推导规则**（从 4 色色板出发）：
- 主强调 → `--brand`，第二强调 → `--brand-2`（次强调，头像底/引用线/shiki 参数色等），中性色承担 `background/surface/foreground`。
- 语义色就近取色板，缺失的用标准语义色（success 绿/warning 琥珀/error 红/info 蓝）并向主题色相靠拢。
- 色板 hex → oklch 转换后与现有 token 格式对齐（`oklch(L% C H)`）。
- 暗色推导：bg 降到 L≈16–22%（主题色相低彩度），surface 高 3–5%，fg L≈90–93%，muted L≈65–72%，border L≈27–33%，brand/brand-2/语义色提亮到 L≈62–78% 保对比。

## 新增一套主题（3 步）

1. `themes/<id>.css`：按上面契约写（可复制 `ocean.css` 模板改值）。
2. `app/globals.css`：加一行 `@import "./styles/themes/<id>.css";`。
3. `lib/theme.ts`：`Preset` 联合类型 + `PRESETS` 各加一条（swatch 用该主题 brand 的 hex）。

组件**零改动**——工具类 `bg-brand`/`rounded-md`/`shadow-md`/`duration-200` 等全部跟随 token。

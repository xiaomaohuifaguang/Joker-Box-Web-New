# 自定义主题指南

本文说明如何给 Joker Box 新增一套主题：从创建 CSS 文件到在系统里选中它，以及每个变量的含义和用途。

一套主题就是一个 CSS 文件，组件不用改。按钮、卡片、菜单等都读取这些变量，换主题只是换变量的值。

> 主题在**构建时**打包进系统，用户不能在页面上粘贴配置。新增或修改主题后，需要重新构建并部署才会上线；桌面端需要重新打包。

## 快速开始

共 3 步，以新增一套 id 为 `my-theme`、名称为「我的主题」的主题为例。

### 第 1 步：创建 CSS 文件

新建 `app/styles/themes/my-theme.css`，把[完整模板](#完整模板)复制进去，再把其中所有 `my-theme` 换成你的主题 id。

主题 id 的要求：

- 只用小写字母、数字和连字符。
- 不能和现有 id 重复：`joker`、`ocean`、`sunset`、`forest`、`minimal`、`golden`、`arctic`、`rose`、`tech`、`botanical`、`midnight`。
- 文件名、CSS 选择器、`lib/theme.ts` 里的 id，三处必须完全一致。

### 第 2 步：在 `app/globals.css` 里引入

加到其他主题后面。**必须放在 `joker.css` 之后**，否则样式优先级会出问题。

```css
@import "./styles/themes/midnight.css";
@import "./styles/themes/my-theme.css"; /* 新增这一行 */
```

### 第 3 步：在 `lib/theme.ts` 里注册

两处都要加：

```ts
export type Preset =
  | "joker"
  // ...其他主题
  | "midnight"
  | "my-theme"; // 新增

export const PRESETS: { id: Preset; name: string; swatch: string }[] = [
  { id: "joker", name: "Joker", swatch: "#d9b44a" },
  // ...其他主题
  { id: "midnight", name: "星河", swatch: "#4a4e8f" },
  { id: "my-theme", name: "我的主题", swatch: "#4f46e5" }, // 新增
];
```

- `name`：外观菜单里显示的名称。
- `swatch`：外观菜单里的小色点，填主题 `--brand` 对应的十六进制色值。

### 查看和上线

1. 运行 `npm run dev`，打开页面，点顶栏的外观按钮（调色板图标），选择「我的主题」。
2. 分别切换浅色和深色，对照[检查清单](#检查清单)看一遍。
3. 运行 `npm run build` 确认能构建，再部署 `out/`。

## 完整模板

把下面的内容保存为 `app/styles/themes/my-theme.css`，然后修改取值。

```css
/* 我的主题：一句话描述风格 */

/* ===== ① 变量 ===== */

/* 浅色模式：所有变量都写在这里 */
:root[data-theme="my-theme"] {
  /* 基础颜色 */
  --background: oklch(98% 0.005 270);        /* 页面背景 */
  --foreground: oklch(25% 0.03 270);         /* 主要文字 */
  --surface: oklch(100% 0 0);                /* 卡片、弹窗、侧栏的底色 */
  --muted-foreground: oklch(50% 0.02 270);   /* 次要文字 */
  --border: oklch(90% 0.01 270);             /* 边框、分隔线 */

  /* 品牌色 */
  --brand: oklch(50% 0.2 275);               /* 主按钮、选中态、链接、聚焦环 */
  --brand-2: oklch(55% 0.15 330);            /* 第二强调色：头像底色、图表第二色等 */

  /* 语义色 */
  --success: oklch(50% 0.12 155);            /* 成功、启用、已发布 */
  --warning: oklch(52% 0.11 70);             /* 警告、待处理 */
  --error: oklch(52% 0.18 27);               /* 错误、删除等危险操作 */
  --info: oklch(50% 0.12 245);               /* 提示、审批中 */

  /* 字体：只能从下面的「可用字体」里选 */
  --display-font: var(--font-geist-sans);    /* h1-h4 标题 */
  --body-font: var(--font-geist-sans);       /* 正文 */
  --mono-font: var(--font-geist-mono);       /* 代码、路径、编号 */
  --brand-font: var(--font-geist-sans);      /* Logo 字标和首页大标题 */

  /* 形状 */
  --radius: 0.5rem;                          /* 圆角基准 */

  /* 阴影 */
  --shadow-x: 0px;                           /* 水平偏移 */
  --shadow-y: 4px;                           /* 垂直偏移 */
  --shadow-blur: 12px;                       /* 模糊半径 */
  --shadow-spread: 0px;                      /* 扩散半径 */
  --shadow-opacity: 0.1;                     /* 不透明度，0 到 1 */
  --shadow-color: 25% 0.03 270;              /* 阴影颜色，只写三个数，不带 oklch() */

  /* 字距 */
  --tracking-display: -0.01em;               /* 标题字距 */
  --tracking-normal: 0em;                    /* 正文字距 */

  /* 动效 */
  --motion-duration: 200ms;                  /* 过渡时长基准 */
  --motion-ease: cubic-bezier(0.4, 0, 0.2, 1); /* 过渡曲线 */

  /* 间距：会缩放全站布局，一般不要改 */
  --space-unit: 0.25rem;
}

/* 深色模式：只需覆盖 11 个颜色，其余沿用上面的值 */
:root[data-theme="my-theme"].dark {
  --background: oklch(18% 0.02 270);
  --foreground: oklch(93% 0.01 270);
  --surface: oklch(23% 0.025 270);
  --muted-foreground: oklch(70% 0.02 270);
  --border: oklch(32% 0.03 270);
  --brand: oklch(72% 0.15 275);
  --brand-2: oklch(75% 0.13 330);
  --success: oklch(75% 0.13 155);
  --warning: oklch(78% 0.13 70);
  --error: oklch(70% 0.16 27);
  --info: oklch(74% 0.11 245);
}

/* ===== ② 专属效果（可选）===== */

/* 选中文字的颜色，建议保留 */
:root[data-theme="my-theme"] ::selection {
  background: var(--brand);
  color: var(--background);
}
```

## 变量说明

### 基础颜色

这 5 个决定主题的整体观感。

| 变量 | 含义 | 用在哪里 | 建议 |
|---|---|---|---|
| `--background` | 页面背景 | 页面底色；**也是主按钮和危险按钮的文字色** | 浅色模式亮度 96%-99%，深色模式 16%-25% |
| `--foreground` | 主要文字 | 正文、标题、表格内容 | 和背景对比度至少 4.5:1 |
| `--surface` | 面板底色 | 卡片、弹窗、下拉菜单、侧栏 | 和背景略有差别，才能看出层次 |
| `--muted-foreground` | 次要文字 | 说明文字、表头、未选中的菜单 | 在背景和面板上都至少 4.5:1 |
| `--border` | 边框 | 卡片边框、分隔线、表格线 | 比面板稍深（深色模式稍浅）即可 |

### 品牌色

| 变量 | 含义 | 用在哪里 | 建议 |
|---|---|---|---|
| `--brand` | 主强调色 | 主按钮、选中态、链接、聚焦环、分页当前页、图表第一色 | 既要当文字（压在背景上），也要当按钮底（上面压 `--background`），两种情况都要至少 4.5:1 |
| `--brand-2` | 第二强调色 | 头像默认底色、Logo 小丑帽的铃铛、图表第二色、JSON 工具的字符串 | 和 `--brand` 明显不同；头像上也压 `--background` 色的文字 |

### 语义色

状态徽标和提示消息会用到这 4 个。徽标是「12% 淡底 + 语义色文字」，所以语义色压在淡底上也要清楚。

| 变量 | 含义 | 用在哪里 |
|---|---|---|
| `--success` | 成功 | 启用、已发布、已完成、成功提示 |
| `--warning` | 警告 | 待处理、警告提示 |
| `--error` | 错误和危险 | 删除、拒绝、退出登录、错误提示。危险按钮是这个底色加 `--background` 色的文字 |
| `--info` | 信息 | 审批中、待认领、信息提示 |

### 字体

| 变量 | 含义 | 用在哪里 |
|---|---|---|
| `--display-font` | 标题字体 | `h1`-`h4` 和 `font-display` |
| `--body-font` | 正文字体 | 全站默认字体 |
| `--mono-font` | 等宽字体 | 代码、路径、编号 |
| `--brand-font` | 字标字体 | Logo 上的「Joker Box」和首页大标题 |

**可用字体**只有这 3 个：

| 取值 | 字体 | 风格 |
|---|---|---|
| `var(--font-geist-sans)` | Geist | 无衬线 |
| `var(--font-fraunces)` | Fraunces | 衬线 |
| `var(--font-geist-mono)` | Geist Mono | 等宽 |

这些都是西文字体，中文统一回退到 PingFang SC、Microsoft YaHei，这部分已在 `app/styles/tokens.css` 里配好。

要用其他字体，先在 `app/layout.tsx` 用 `next/font` 加载，再把它的 CSS 变量填到这里。

> `--brand-font` 不写时，不会回退到 `--display-font`，而是继承 Joker 的 Fraunces。想让字标跟随标题字体，要显式写出来。

### 形状

`--radius` 是圆角基准，其他圆角按比例计算。

| 工具类 | 实际圆角 | 用在哪里 |
|---|---|---|
| `rounded-sm` | `--radius` × 0.25 | 很小的元素 |
| `rounded-md` | `--radius` × 0.5 | 按钮、输入框、菜单项、徽标 |
| `rounded-lg` | `--radius` × 1 | 卡片、弹窗、表格外框 |
| `rounded-xl` | `--radius` × 1.5 | 少量大面板 |

常用取值：`0rem` 直角，`0.5rem` 适中，`1rem` 圆润。

### 阴影

阴影主要用在弹窗和下拉菜单这类浮层上。只填这 6 个分量，`shadow-2xs` 到 `shadow-2xl` 共 7 档由 `app/styles/tokens.css` 自动计算。

| 变量 | 含义 | 示例 |
|---|---|---|
| `--shadow-x` | 水平偏移 | `0px` |
| `--shadow-y` | 垂直偏移 | `4px` |
| `--shadow-blur` | 模糊半径，越大越柔和 | `12px` |
| `--shadow-spread` | 扩散半径 | `0px` |
| `--shadow-opacity` | 不透明度，0 为没有阴影 | `0.1` |
| `--shadow-color` | 阴影颜色，**只写三个数** | `25% 0.03 270` |

`--shadow-color` 的格式容易写错：写 `25% 0.03 270` 是对的，写 `oklch(25% 0.03 270)` 会让所有阴影失效。

### 字距

| 变量 | 含义 | 用在哪里 | 建议 |
|---|---|---|---|
| `--tracking-display` | 标题字距 | `h1`-`h4` | `-0.02em` 到 `0em`，中文不宜太紧 |
| `--tracking-normal` | 正文字距 | 全站文字，`tracking-*` 工具类以它为基准 | 一般 `0em` |

### 动效

| 变量 | 含义 | 建议 |
|---|---|---|
| `--motion-duration` | 过渡时长基准。`duration-150` 和 `duration-200` 等于它，`duration-300` 是 1.5 倍，`duration-500` 是 2.5 倍 | `120ms`-`240ms` |
| `--motion-ease` | 过渡曲线，作用于 `ease-in-out` | 工具型界面用 `cubic-bezier(0.4, 0, 0.2, 1)`，不建议用带回弹的曲线 |

### 间距

`--space-unit` 是所有 `p-*`、`m-*`、`gap-*`、`h-*` 的基准单位，改它会等比缩放整个布局，容易造成破版。除非确实要做紧凑或宽松版，否则保持 `0.25rem`。

### 自动计算的颜色

这些不用写，由 `app/styles/tokens.css` 从上面的变量算出来：

| 用途 | 来源 |
|---|---|
| 主按钮文字 | `--background` |
| 悬停底色（`bg-accent`） | `--foreground` 9% + `--surface` |
| 表头、次要按钮底色（`bg-muted`、`bg-secondary`） | `--foreground` 5%-6% + `--surface` |
| 输入框边框 | `--foreground` 30% + `--surface` |
| 图表前两色 | `--brand`、`--brand-2` |

## 怎么挑颜色

**格式：** 用 `oklch(亮度 彩度 色相)`，例如 `oklch(50% 0.2 275)`。

| 部分 | 范围 | 含义 |
|---|---|---|
| 亮度 | 0%-100% | 0% 是黑，100% 是白 |
| 彩度 | 0-0.37 左右 | 0 是灰色，越大越鲜艳；界面常用 0.1-0.2 |
| 色相 | 0-360 | 约 27 红、70 橙、90 黄、155 绿、245 蓝、275 靛、330 粉 |

已有十六进制色值时，可以用 <https://oklch.com> 转换。

**建议的取色步骤：**

1. 选一个色相当品牌色，先定 `--brand`。
2. 基础颜色用同一色相，彩度压到 0.03 以下，整体才协调。
3. 深色模式整体提亮强调色：`--brand` 和语义色的亮度提到 62%-80%，否则在深底上看不清。

| 变量 | 浅色模式亮度 | 深色模式亮度 |
|---|---|---|
| `--background` | 96%-99% | 16%-25% |
| `--surface` | 98%-100% | 比背景高 3%-5% |
| `--foreground` | 20%-30% | 90%-95% |
| `--muted-foreground` | 45%-52% | 65%-75% |
| `--border` | 85%-92% | 27%-38% |
| `--brand` 和语义色 | 45%-55% | 62%-80% |

## 专属效果（可选）

可以在主题文件里加这个主题独有的效果。选择器**必须**以 `:root[data-theme="你的id"]` 开头，否则会影响所有主题。

组件上有 `data-slot` 属性可以用来定位，例如 `button`、`dialog-content`、`dropdown-menu-content`。

```css
/* 弹窗加品牌色边框 */
:root[data-theme="my-theme"] [data-slot="dialog-content"] {
  border-color: color-mix(in oklab, var(--brand) 40%, var(--border));
}
```

注意：

- 不要给 `body`、卡片或侧栏加纹样，会干扰文字和表格阅读。
- 不要给所有按钮加上浮或抖动动画，工具型页面长时间使用会分散注意力。
- 需要特殊阴影时，可以在主题文件里覆盖 `--elevation-md` 这类变量。

## 检查清单

浅色和深色各看一遍：

- [ ] **文字：** 主要和次要文字在页面背景、卡片上都清楚。
- [ ] **主按钮：** 文字和底色对比足够。
- [ ] **危险操作：** 删除按钮和主按钮一眼能分开（可看流程处理页的「通过」和「拒绝」）。
- [ ] **菜单：** 侧栏和顶栏的选中项、悬停态明显。
- [ ] **状态徽标：** 启用、已发布、审批中等徽标看得清（可看码表管理、流程设计）。
- [ ] **层次：** 卡片和页面背景能区分开，弹窗浮得起来。
- [ ] **输入框：** 边框看得见，聚焦时有明显变化。
- [ ] **图表：** 数据展板的图表颜色清楚。
- [ ] **布局切换：** 前台顶栏和侧栏两种布局都正常。
- [ ] **构建：** `npm run build` 通过。

## 常见问题

**外观菜单里看不到新主题？**
检查 `lib/theme.ts` 的 `PRESETS` 有没有加，保存后刷新页面。

**选中了但样式没变？**
通常是三处 id 不一致，或 `app/globals.css` 里漏了 `@import`。

**只有部分颜色生效？**
漏写的变量会继承 Joker 的值，不会报错。对照模板检查有没有缺项。

**深色模式没变化？**
检查选择器是否写成 `:root[data-theme="my-theme"].dark`，`.dark` 前面不能有空格。

**阴影消失了？**
多半是 `--shadow-color` 写成了 `oklch(...)`，应该只写三个数。

**用户原来选的主题被删了会怎样？**
`lib/theme.ts` 校验不通过时按 Joker 处理，页面样式也回到 Joker，不会出错。

## 相关文件

| 文件 | 作用 |
|---|---|
| `app/styles/themes/*.css` | 各套主题 |
| `app/styles/tokens.css` | 把主题变量映射成 Tailwind 工具类，计算阴影和派生色 |
| `app/globals.css` | 引入所有主题 |
| `lib/theme.ts` | 主题注册表和切换逻辑 |
| `app/styles/README.md` | 面向开发者的主题约定 |

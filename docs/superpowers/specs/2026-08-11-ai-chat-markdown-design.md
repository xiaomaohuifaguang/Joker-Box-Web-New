# AI 会话助手 · 内容区 Markdown 增强 设计

> 日期：2026-08-11。范围：`components/ai-chat/` 的 assistant 消息渲染。前置：抽屉已有 markdown（`react-markdown + remark-gfm` + prose），本设计把它升级为完整的内容渲染管线。

## 目标

让 assistant 的 markdown 输出达到「可用的 AI 会话内容区」水准：代码块（复制/语言标签/横向滚动/语法高亮）、GFM 排版（表格/任务列表/引用/分割线）贴合主题、消息级操作（复制全文）、长回答回到底部浮钮，以及进阶的数学公式（KaTeX）与 Mermaid 图。全部 token 派生，跟随 5 预设 × 明暗。

## 已确认的决策（用户拍板）

| 点 | 决策 |
|---|---|
| 语法高亮配色 | **融入预设 token**（Shiki CSS-var 双主题，把 Shiki 变量映射到 `--muted-foreground`/`--brand`/`--felt` 等；亮暗经 `.dark` 切换） |
| 代码块复制钮/语言栏 | **hover 浮现**（移动端常驻） |
| 重新生成 | **不做**（本轮只做「复制全文」；重新生成等后端干净接口） |
| Mermaid 主题 | **跟预设 token**（`base` theme 映射项目变量） |

## 架构：一条可组合的渲染管线

`MarkdownRenderer.tsx` 从「只有 remark-gfm」升级为可配管线。全部仍是 React 树输出（无 `dangerouslySetInnerHTML`，唯一例外 Mermaid 见下）。

- **remark plugins**：`remarkGfm`（已有）+ `remarkMath`（新）。
- **rehype plugins**：`rehypeKatex`（数学）+ `@shikijs/rehype`（代码高亮）。
- **components 映射**（react-markdown 的 `components` prop）：
  - `pre` → 自定义「代码块卡」（复制 + 语言标签 + 横向滚动 + mermaid 分流）
  - `table` → 横向滚动包裹
  - `blockquote` / `hr` / `input[type=checkbox]`（任务列表）→ 主题化
- 重依赖（shiki / katex / mermaid）**继续懒加载**，只在渲染到对应内容时拉取，不进首屏 bundle。

## 插件顺序（关键）

`@shikijs/rehype` 必须在 `rehypeKatex` **之前**（或确保 Shiki 不处理 math 节点）：Shiki 只认 `pre > code` 的语言类，KaTeX 处理 `$…$`。二者作用节点不重叠，但顺序要固定，避免 Shiki 把 `language-math` 块误当代码。Mermaid 块在 `pre` 组件层分流（language 为 `mermaid` 时不交给 Shiki 的视觉，而渲染图）。

## 分块设计

### 块 1 · 代码块卡（复制 + 语言标签 + 滚动 + mermaid 分流入口）

自定义 `pre` 渲染成「代码卡」：
- 顶部细栏：左侧语言标签（`ts`/`py` 小写 mono，`text-muted-foreground`）；右侧复制钮（`Button ghost icon-xs`，`navigator.clipboard.writeText(原始码)` + 打勾反馈 + `toast.success("已复制")`，沿用 `jsonFormat` 页的复制模式）。
- hover 浮现（`group`/`group-hover`），移动端（`@media (hover:none)`）常驻。
- 代码区 `overflow-x-auto`，长行不撑破 512px 抽屉。
- `language-mermaid` 分流到块 7 的 Mermaid 组件，不走 Shiki 视觉。
- 复制内容取 **code 的原始文本**（从 `pre` 的 children/code 节点取 `node.children` 文本），不是渲染后的高亮 HTML。

### 块 2 · 语法高亮（@shikijs/rehype，融入预设 token）

- 插件：`@shikijs/rehype@4`，选项 `themes: { light: <lightTheme>, dark: <darkTheme> }`、`defaultColor: false`、`colorsRendering: "css-vars"`（默认）。
- **机制（已从 4.4.3 源码确认）**：每个 token 发 `color: var(--shiki-light)`，并输出内联 `--shiki-light: <色>; --shiki-dark: <色>`；变量后缀 = `themes` 的 key。于是一条 CSS 规则即可让暗色覆盖：
  ```css
  .dark .ai-md .shiki, .dark .ai-md .shiki span { color: var(--shiki-dark) !important; }
  ```
- **融入预设**：不套现成 vscode 主题，而是用 Shiki 的 `css-variables` 主题（`variablePrefix: "--shiki-"`），再在 `globals.css` 把 `--shiki-foreground`/`--shiki-token-keyword`/… 映射到项目 token（`--muted-foreground`/`--brand`/`--felt`/`--info`/`--warning` 等），亮暗各一组。这样高亮随 5 预设 × 明暗自动变化。
  - 风险/工作量：Shiki css-variables 主题支持的变量名有限（`--shiki-foreground`、`--shiki-background`、`--shiki-token-*`、`--shiki-ansi-*`），映射是「近似」而非逐语法精确。可接受——目标是「协调、可读、随预设」，不是复刻某 IDE 配色。
- 体积：shiki 较大 → `MarkdownRenderer` 已懒加载，继续整体懒加载即可。

### 块 3 · GFM 排版适配（纯 CSS，无依赖）

- **表格**：`overflow-x-auto` 包裹 + 表头/边框/斑马纹用 `--border`/`--muted` token（现在默认灰不跟预设）。
- **任务列表**：`input[type=checkbox]`（gfm 输出为 disabled checkbox）主题化；`~~删除线~~`、裸链自动链接样式。
- **引用块 / `<hr>`**：用 `--felt`/`--border` token。
- **特异性坑**：照 CLAUDE.md「`.prose img` margin 特异性」经验，表格/复选框的 prose 覆盖用足够特异性选择器（必要时 `[data-...]` 限定），写在 `globals.css`，不靠 utility 硬压。

### 块 4 · 消息级操作（仅复制全文）

- hover 助手消息（移动端常驻）底部/角落浮现小操作条：**复制全文**（复制该消息的 markdown 源文本 `m.content`，非渲染 HTML）。
- 用 `Button ghost icon-xs` + `Copy`/`Check` 图标 + toast。不重生成（决策：等后端接口）。

### 块 5 · 回到底部浮钮

- 消息区（ScrollArea viewport）上滑超过阈值且非贴底时，右下角浮 `↓ 回到底部` 钮；点击平滑滚到底。
- 监听 viewport 的 `scroll`（`ref` 拿 viewport 元素），流式期间如果用户已上滑则不强制拉到底（现在是无条件滚到底——本块顺带修正为「贴底才跟随」）。

### 块 6 · 数学公式（KaTeX）

- `remark-math` + `rehype-katex` + `import "katex/dist/katex.min.css"`。
- `$...$` 行内 / `$$...$$` 块级。字体用 KaTeX 自带（数学排版通用，不强求跟预设字体）。
- 懒加载：katex css/js 随 MarkdownRenderer 一并懒加载。

### 块 7 · Mermaid 图（跟预设 token）

- ` ```mermaid ` 代码块 → `pre` 组件分流到 `AiMermaid` 组件。
- `mermaid`（懒加载）`mermaid.render(id, source)` 得 SVG 字符串 → 注入容器。这是**唯一需要处理 HTML 注入**的点：走 `DOMPurify.sanitize(svg)`（ganDaShi 已有同款 + `typeof window` 守卫）后渲染，或直接 `ref.innerHTML = sanitized`。
- 主题：`mermaid.initialize({ theme: "base", themeVariables: {…} })`，`themeVariables` 映射项目 token（`--brand`/`--felt`/`--border`/`--muted-foreground` 等），亮暗各一套（监听 `.dark`/预设变化重渲，或在 render 时读 `getComputedStyle`）。
- 体积：mermaid 很重 → 独立 `next/dynamic` 懒加载，只在出现 mermaid 块时拉。

## 依赖与体积（坦白账）

新增：`remark-math`、`rehype-katex`、`katex`、`@shikijs/rehype`(+`shiki`)、`mermaid`。
Shiki、Mermaid 体积大，**全部懒加载**：静态导出无 SSR 约束，`next/dynamic` `ssr:false` 写在 client 组件内（符合 Next 16 约束）。首屏不受影响。

## 样式归属与主题一致性

- 所有颜色走 `globals.css` 的 token + `@custom-variant dark`；Shiki/Mermaid/KaTeX 的颜色映射写在 `globals.css`（或一个 `ai-md` 作用域块），组件侧不硬编码颜色。
- 作用域：给 MarkdownRenderer 根加 `data-ai-md`（或 `.ai-md`），所有 prose/Shiki/Mermaid 覆盖限定在该作用域，避免污染 ganDaShi 的其它 prose。

## 风险点

1. **Shiki 变量映射是近似**——接受（目标是协调随预设）。
2. **Mermaid 重渲染时机**（预设/明暗切换）——监听 theme 变化重渲，初版可在 render 时读 computed token。
3. **prose 特异性**（表格/复选框）——按既有坑经验用高特异性选择器。
4. **流式期间 Shiki 反复高亮**——流式消息内容每帧变，高亮整段会反复跑；可对流式中的消息降级为「无高亮代码块」，落定后再高亮（优化，列入计划的可选步骤）。

## 实施顺序（按风险/依赖）

1. 块 3 GFM 适配（纯 CSS，零风险先行）
2. 块 1 代码块卡（复制/标签/滚动/分流入口，无新依赖）
3. 块 2 Shiki 高亮（含 token 映射）
4. 块 5 回到底部 + 块 4 复制全文（轻交互）
5. 块 6 KaTeX
6. 块 7 Mermaid（最后啃，重 + 主题映射）

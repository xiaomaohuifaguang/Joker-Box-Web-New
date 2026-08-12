# AI 会话助手 · 内容区 Markdown 增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 AI 抽屉的 assistant 消息渲染升级为完整内容区：代码块卡（复制/语言标签/滚动）、Shiki 语法高亮（融入预设 token）、GFM 排版适配（表格/任务列表/引用/分割线）、消息级复制、回到底部浮钮、KaTeX 数学、Mermaid 图。

**Architecture:** `MarkdownRenderer` 升级为可配管线：remark(`remarkGfm`+`remarkMath`) → rehype(`@shikijs/rehype` 在前 → `rehypeKatex`)，并经 react-markdown 的 `components` prop 把 `pre`/`table` 等映射到自定义主题化组件。重依赖（shiki/katex/mermaid）全部懒加载（`MarkdownRenderer` 已经 `next/dynamic ssr:false`，Mermaid 再单独动态一次）。颜色全部走 `globals.css` token + `@custom-variant dark`，作用域限定 `[data-ai-md]`。

**Tech Stack:** Next.js 16 static export / React 19 / TS strict / Tailwind v4 / react-markdown@10 / remark-gfm@4 / @shikijs/rehype@4(+shiki@4) / remark-math@6 / rehype-katex@7 / katex / mermaid@11 / DOMPurify(已有)。

## 接口约定

- 无新后端接口。纯前端渲染增强。
- react-markdown `components` prop（v10 已确认）：`components={{ pre: CodeBlock, table: ..., ... }}`，组件收到 `ExtraProps{ node?: Element }` + 普通 DOM props（`className`/`children`）。
- 代码文本/语言：react-markdown 渲染的 `<code className="language-xxx">`，文本在 children；自定义 `pre`/`code` 组件从 `className` 提取语言、从 `node`（hast Element）`children` 递归取纯文本。
- Shiki css-var 双主题（4.4.3 源码已确认）：`themes:{light,dark}` + `defaultColor:false` + `colorsRendering:"css-vars"`(默认) → 每 token 发 `color: var(--shiki-light)` 且内联输出 `--shiki-light:<色>;--shiki-dark:<色>`；CSS 里 `.dark …{ color: var(--shiki-dark) }` 即切暗。

## Global Constraints

- **Static export**（`output:'export'`）：无 SSR。所有交互/渲染组件 `"use client"`。
- **导入一律 `@/`**（同 feature 目录内 `./X` 相对导入允许）；一文件一组件；PascalCase 组件；`useXxx` hook。
- **TS strict，无 `any`**。
- **lint 红线 `react-hooks/set-state-in-effect`**：effect 只在异步回调 setState；DOM 操作（注入/滚动/测量）允许。`react-hooks/static-components`：模块级组件。
- **主题**：禁写死颜色；用 token（`--brand`/`--felt`/`--muted-foreground`/`--border` 等）+ `color-mix`；亮暗经 `@custom-variant dark`。所有 prose/Shiki/Mermaid 覆盖**限定 `[data-ai-md]` 作用域**，不污染 ganDaShi 的其它 prose。
- **特异性坑**（CLAUDE.md）：prose 给元素选择器的特异性高于 utility，覆盖表格/复选框等用足够特异性选择器写在 `globals.css`，不靠 utility 硬压。
- **复制模式**：`navigator.clipboard.writeText` + 临时 `copied` state + `toast.success("已复制")`（沿用 `jsonFormat` 页）。
- toast：`import { toast } from "sonner"`。
- 验证命令：`npx tsc --noEmit`、`npx eslint <改动文件>`（0 error 0 warning）、`npm run build`。
- **已知坑**：`.next/dev/types/**` 陈旧 typegen 会报假 tsc 错——`rm -rf .next/dev` 后重跑，别当代码错误追。
- 每个 task 结束 `git add` 只加本任务改动文件，按给定 message 提交。

---

### Task 1: GFM 排版适配（表格/任务列表/引用/分割线/hr，纯 CSS）

**Files:**
- Modify: `components/ai-chat/MarkdownRenderer.tsx`（根加 `data-ai-md` + table/blockquote/hr 的 components 映射）
- Modify: `app/globals.css`（`[data-ai-md]` 作用域内的表格/复选框/引用/hr 主题化样式）

**Interfaces:**
- Consumes: 现有 `MarkdownRenderer({content, className?})`。
- Produces: `data-ai-md` 作用域标记（后续 Shiki/Mermaid 样式共用）；`MarkdownRenderer` 新增 `components` 映射（后续 Task 往里面加 `pre`）。

纯排版适配，无新依赖。`components` 里先用内联对象映射 `table`/`hr`（模块级常量，避开 static-components）。

- [ ] **Step 1: MarkdownRenderer 根加作用域 + components 映射**

`components/ai-chat/MarkdownRenderer.tsx` 改为：
```tsx
"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// react-markdown 直接渲染（输出 React 树，XSS 安全）。仅供 AiMarkdown 懒加载封装内部用。

// 提升到模块作用域：每次渲染新建 [remarkGfm] 会让 unified 因插件引用变化而重跑管线，
// 导致已落定（非流式）的 markdown 消息也被无谓重解析。
const REMARK_PLUGINS = [remarkGfm];

// GFM 排版适配：表格横向滚动包裹；hr 主题化。模块级常量（避开 react-hooks/static-components）。
// 语言标签/复制等的 pre 映射在后续 Task 加入本对象。
const MD_COMPONENTS = {
  // 表格包一层可横向滚动的容器（窄抽屉不溢出）。
  table: ({ node: _node, className, children, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => (
    <div className="ai-md-table-wrap overflow-x-auto">
      <table className={className} {...props}>{children}</table>
    </div>
  ),
};

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      data-ai-md=""
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        // 代码块/inline code 用主题 token；去 prose 给 code 加的引号。
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border/60",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        // 段落/列表间距收紧，聊天气泡里更紧凑。
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2",
        "prose-a:text-brand prose-a:underline",
        className,
      )}
    >
      <Markdown remarkPlugins={REMARK_PLUGINS} components={MD_COMPONENTS}>{content}</Markdown>
    </div>
  );
}
```

> 注：`_node` 解构丢弃避免 unused 告警（react-markdown 会给组件传 `node`）。表格滚动用 wrapper div（`overflow-x-auto`）——prose 的 table 自身不好直接加 overflow。

- [ ] **Step 2: globals.css 加 `[data-ai-md]` 主题化样式**

在 `app/globals.css` 末尾追加（用足够特异性覆盖 prose 默认）：
```css
/* ===== AI 会话 markdown 内容区（[data-ai-md] 作用域，随 5 预设 × 明暗）===== */
/* 表格：边框/表头/斑马纹走 token；横向滚动由 .ai-md-table-wrap 提供。 */
[data-ai-md] .ai-md-table-wrap { margin: 0.5rem 0; border: 1px solid var(--border); border-radius: var(--radius-md); }
[data-ai-md] table { margin: 0; border-collapse: collapse; width: 100%; font-size: 0.85em; }
[data-ai-md] table th,
[data-ai-md] table td { border: 1px solid var(--border); padding: 0.35rem 0.6rem; text-align: left; }
[data-ai-md] table thead th { background: color-mix(in oklab, var(--muted) 60%, transparent); color: var(--foreground); font-weight: 600; }
[data-ai-md] table tbody tr:nth-child(even) { background: color-mix(in oklab, var(--muted) 30%, transparent); }

/* 引用块：felt 左线 + 弱化文字。 */
[data-ai-md] blockquote { border-left: 2px solid color-mix(in oklab, var(--felt) 55%, transparent); padding-left: 0.75rem; color: var(--muted-foreground); font-style: normal; margin: 0.5rem 0; }
[data-ai-md] blockquote p { margin: 0.25rem 0; }

/* 分割线：border token。 */
[data-ai-md] hr { border: none; border-top: 1px solid var(--border); margin: 0.75rem 0; }

/* GFM 任务列表复选框：accent 化 + 禁原生 margin 怪异。 */
[data-ai-md] input[type="checkbox"] { accent-color: var(--brand); margin: 0 0.35rem 0 0; vertical-align: middle; }
[data-ai-md] li:has(> input[type="checkbox"]) { list-style: none; margin-left: -1.25rem; }

/* 删除线颜色弱化。 */
[data-ai-md] del { color: var(--muted-foreground); }
```

- [ ] **Step 3: 验证** `npx tsc --noEmit && npx eslint components/ai-chat/MarkdownRenderer.tsx` PASS

- [ ] **Step 4: Commit**
```bash
git add components/ai-chat/MarkdownRenderer.tsx app/globals.css
git commit -m "feat(ai-chat): GFM 排版适配——表格滚动+token 边框/斑马纹，引用 felt 左线，hr/任务列表/删除线主题化([data-ai-md] 作用域)"
```

---

### Task 2: 代码块卡（复制 + 语言标签 + 横向滚动 + mermaid 分流入口）

**Files:**
- Create: `components/ai-chat/AiCodeBlock.tsx`（代码卡：复制/语言标签/滚动）
- Modify: `components/ai-chat/MarkdownRenderer.tsx`（`pre` 映射到 `AiCodeBlock`）

**Interfaces:**
- Consumes: Task 1 的 `MD_COMPONENTS`（往里面加 `pre`）。
- Produces: `AiCodeBlock`（被 `pre` 映射用）；从 `pre` 提取 `language`/`codeText` 的工具（Task 7 Mermaid 复用分流判断）。

代码卡接管 `pre`。语言从内部 `<code className="language-xxx">` 提取；纯文本从 hast `node` 递归提取（复制用原始码，非高亮 HTML）。`language-mermaid` 本 Task 先按普通代码卡显示（Mermaid 渲染在 Task 7 接入分流点）。

- [ ] **Step 1: 写 AiCodeBlock.tsx**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// 从 hast 节点递归提取纯文本（复制用原始码，非高亮后的标签）。
function extractText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    const el = node as { value?: string; children?: unknown };
    if (typeof el.value === "string") return el.value;
    if (el.children) return extractText(el.children);
  }
  return "";
}

// 从 <code className="language-xxx"> 提取语言名。
function extractLang(node: unknown): string {
  if (node == null || typeof node !== "object") return "";
  if (Array.isArray(node)) {
    for (const c of node) { const l = extractLang(c); if (l) return l; }
    return "";
  }
  const el = node as { tagName?: string; properties?: { className?: unknown }; children?: unknown };
  if (el.tagName === "code") {
    const cn = el.properties?.className;
    const cls = Array.isArray(cn) ? cn.join(" ") : typeof cn === "string" ? cn : "";
    const m = /language-([\w-]+)/.exec(cls);
    if (m) return m[1];
  }
  if (el.children) return extractLang(el.children);
  return "";
}

// 代码块卡：顶栏（语言标签 + 复制钮，hover 浮现 / 移动端常驻）+ 横向滚动代码区。
// 作为 react-markdown 的 pre 组件接入（children = 高亮后的 <code>，node = hast pre 节点）。
export function AiCodeBlock({
  node,
  children,
}: {
  node?: unknown;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const lang = extractLang(node);
  const codeText = extractText(node);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="group/code relative mb-2 overflow-hidden rounded-md border border-border/60 bg-muted">
      {/* 顶栏：hover 浮现（移动端常驻，靠全局 CSS [data-ai-md] 下 hover:none 处理）。 */}
      <div className="ai-md-codebar flex items-center justify-between border-b border-border/60 bg-muted/80 px-2.5 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{lang || "code"}</span>
        <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="复制代码" title="复制代码">
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      {/* 代码区：横向滚动。pre 样式走 [data-ai-md] 作用域（清掉顶栏带来的圆角/边框重叠）。 */}
      <pre className="ai-md-pre overflow-x-auto p-3 text-xs">{children}</pre>
    </div>
  );
}
```

- [ ] **Step 2: MarkdownRenderer 把 pre 映射到 AiCodeBlock**

`MarkdownRenderer.tsx`：import 加 `import { AiCodeBlock } from "./AiCodeBlock";`，`MD_COMPONENTS` 加一项：
```tsx
const MD_COMPONENTS = {
  table: (/* …Task 1 保持… */) => (/* … */),
  // 代码块卡（复制/语言标签/滚动）。
  pre: ({ node, children }: { node?: unknown; children?: ReactNode }) => (
    <AiCodeBlock node={node}>{children}</AiCodeBlock>
  ),
};
```
文件顶部 import `type { ReactNode } from "react"`（若尚无）。

- [ ] **Step 3: globals.css 加代码卡作用域样式**

`app/globals.css` 的 AI 区块内追加：
```css
/* 代码卡内 pre：清掉卡片边框/背景重叠，仅留滚动与留白；字号 mono。 */
[data-ai-md] pre.ai-md-pre { margin: 0; border: none; background: transparent; font-family: var(--mono-font); }
/* 顶栏 hover 浮现（桌面）；触屏常驻。 */
@media (hover: hover) {
  [data-ai-md] .ai-md-codebar { opacity: 0; transition: opacity var(--motion-duration) var(--motion-ease); }
  [data-ai-md] .group\/code:hover .ai-md-codebar,
  [data-ai-md] .group\/code:focus-within .ai-md-codebar { opacity: 1; }
}
```

- [ ] **Step 4: 验证** `npx tsc --noEmit && npx eslint components/ai-chat/` PASS

- [ ] **Step 5: Commit**
```bash
git add components/ai-chat/AiCodeBlock.tsx components/ai-chat/MarkdownRenderer.tsx app/globals.css
git commit -m "feat(ai-chat): 代码块卡——语言标签+复制钮(hover 浮现/移动端常驻)+横向滚动，pre 组件接管"
```

---

### Task 3: Shiki 语法高亮（@shikijs/rehype，融入预设 token）

**Files:**
- Modify: `package.json`（`npm i shiki @shikijs/rehype`）
- Modify: `components/ai-chat/MarkdownRenderer.tsx`（加 rehype 插件链）
- Modify: `app/globals.css`（`[data-ai-md]` 内 Shiki css-var → 项目 token 映射 + 亮暗切换）

**Interfaces:**
- Consumes: Task 2 的代码卡（Shiki 输出的 `<pre class="shiki">` 会被 Task 2 的 `pre` 组件包成卡——注意 Shiki 在 `pre` 上加了 style/class，复制/语言提取仍走 hast `node`，不受影响）。
- Produces: 语法高亮；流式期间降级（见 Step 4）。

- [ ] **Step 1: 装依赖**
```bash
npm install shiki @shikijs/rehype
```

- [ ] **Step 2: MarkdownRenderer 加 rehype 链**

`MarkdownRenderer.tsx`：import 加 `import rehypeShiki from "@shikijs/rehype";`。模块级加：
```tsx
// Shiki 高亮：css-var 双主题（不发死色，颜色由 [data-ai-md] 的 token 映射决定，随预设/明暗）。
// 提升模块作用域，避免每次渲染重建导致 unified 重跑。
const REHYPE_PLUGINS = [
  [rehypeShiki, {
    themes: { light: "css-variables", dark: "css-variables" },
    defaultColor: false,
    cssVariablePrefix: "--shiki-",
  }],
] as const;
```
`<Markdown>` 加 `rehypePlugins={REHYPE_PLUGINS as never}`（`as never` 规避插件元组类型与 react-markdown 期望的精确匹配问题；若 tsc 通过则可去掉）。

> 注：`"css-variables"` 是 Shiki 内置的特殊主题（token 颜色全部发成 `var(--shiki-*)`）。`defaultColor:false` 让它同时输出 `--shiki-light`/`--shiki-dark` 两个变量而非内联死色。

- [ ] **Step 3: globals.css 把 Shiki 变量映射到项目 token（亮暗两组）**

在 AI 区块追加。Shiki css-variables 主题认识的变量有限（`--shiki-foreground/background`、`--shiki-token-keyword/constant/function/string/comment/…`、`--shiki-ansi-*`）。映射到项目语义 token：
```css
/* Shiki css-var → 项目 token（亮色）。让代码高亮随 5 预设走，而非套固定 IDE 配色。 */
[data-ai-md] {
  --shiki-foreground: var(--foreground);
  --shiki-background: var(--muted);
  --shiki-token-keyword: var(--brand);
  --shiki-token-constant: var(--felt);
  --shiki-token-function: var(--info);
  --shiki-token-string: var(--success);
  --shiki-token-comment: var(--muted-foreground);
  --shiki-token-number: var(--warning);
  --shiki-token-operator: var(--foreground);
  --shiki-token-punctuation: var(--muted-foreground);
  --shiki-token-link: var(--brand);
  --shiki-token-parameter: var(--foreground);
  --shiki-token-property: var(--felt);
  --shiki-token-type: var(--info);
}
/* Shiki 双主题切换：暗色用 --shiki-dark 变量着色（css-variables 主题亮暗同值，统一由上面 token 决定，
   故此处只需保证 shiki 节点在暗色下不被内联 light 值压住——token 本身已随 .dark 变）。 */
[data-ai-md] .shiki, [data-ai-md] .shiki span { background-color: transparent; }
```

> 说明：css-variables 主题亮暗发的是同一组 `--shiki-*`（值即上面的 token 引用，token 本身随 `.dark`/预设变），所以不需要单独的 dark 覆盖——颜色天然跟随。Step 2 的 `themes:{light,dark}` 在此语义下退化为一组变量；保留双 key 仅为满足插件类型。实现者若发现 `css-variables` 主题与 `defaultColor:false` 组合不产出可用变量，可退化为 `themes:{light:"css-variables"}` 单主题 + `defaultColor` 省略——以 `npx tsc` 与运行时实际着色为准，并在报告中说明实际生效配置。

- [ ] **Step 4: 流式降级（性能）**

流式中消息内容每帧变，整段 Shiki 高亮会反复跑。给 `MarkdownRenderer` 加可选 prop `plain?: boolean`（流式 pending 时传 true）：为 true 时 `rehypePlugins` 传空数组（不高亮，代码卡仍在、仅无着色），落定后正常高亮。
```tsx
export function MarkdownRenderer({ content, className, plain }: { content: string; className?: string; plain?: boolean }) {
  // … <Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={plain ? EMPTY : REHYPE_PLUGINS} components={MD_COMPONENTS}>
}
```
`AiMarkdown` 透传 `plain`；`AiChatMessages` 渲染 assistant 内容时 `<AiMarkdown content={m.content} plain={!!m.pending} />`。模块级加 `const EMPTY: never[] = [];`。

- [ ] **Step 5: 验证 + 实测** `npx tsc --noEmit && npx eslint components/ai-chat/` PASS；`npm run build` PASS。

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json components/ai-chat/ app/globals.css
git commit -m "feat(ai-chat): Shiki 语法高亮——css-var 融入预设 token(亮暗随 .dark)，流式降级无高亮落定后高亮"
```

---

### Task 4: 消息级复制 + 回到底部浮钮

**Files:**
- Modify: `components/ai-chat/AiChatMessages.tsx`（助手消息 hover 复制条 + 回到底部浮钮 + 贴底才跟随滚动）
- Modify: `app/globals.css`（如需操作条样式，尽量用 utility）

**Interfaces:**
- Consumes: `UiMessage`（`content`/`role`/`pending`）。ScrollArea viewport 元素。
- Produces: 无对外新接口。

- [ ] **Step 1: 助手消息复制全文**

`AiChatMessages.tsx`：助手 `ablock` 容器加 `group/msg relative`；内容末尾（`{m.content && …}` 之后、`</div>` 之前）加 hover 操作条（模块级小组件 `CopyMsgBtn`）：
```tsx
// 单条助手消息的「复制全文」钮：hover 浮现（移动端常驻）。
function CopyMsgBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  }
  return (
    <div className="ai-md-msgops mt-1 flex justify-end">
      <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="复制全文" title="复制全文">
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
```
import 加 `Check, Copy`、`toast`、`Button`、`useState`（若尚无）。在非 pending 且有 content 的助手消息渲染 `<CopyMsgBtn text={m.content} />`。globals.css 的 AI 区块加 hover 浮现规则（同代码卡的 hover:none 常驻模式，选择器 `[data-ai-md] .ai-md-msgops`，但消息容器不在 `[data-ai-md]` 内——改用 `[data-ai-chat]` 或直接给 ScrollArea 容器一个 `data-ai-chat` 标记）。**简化**：把 hover 规则挂到 `.group\/msg` 上，写进 globals（与代码卡同样式块）。

- [ ] **Step 2: 贴底才跟随 + 回到底部浮钮**

`AiChatMessages.tsx`：
1. 拿 ScrollArea viewport：给 `ScrollArea` 内层容器加 `ref` 不行（viewport 是 ScrollArea 内部），改为在 `ScrollArea` 上 `onScroll` 拿不到——用 `useEffect` 里 `bottomRef.current?.closest('[data-radix-scroll-area-viewport]')` 拿 viewport，监听其 scroll。
2. 加 `const [showBackToBottom, setShowBackToBottom] = useState(false)` 与 `stickToBottomRef = useRef(true)`。viewport scroll 监听：`const el = …; const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80; stickToBottomRef.current = nearBottom;` 并 `setShowBackToBottom(!nearBottom)`（异步回调 setState，OK）。
3. 现有滚动 effect 改条件：`if (stickToBottomRef.current) bottomRef.current?.scrollIntoView({behavior: anyPending ? "auto":"smooth", block:"end"})`——用户上滑后不再被强拉到底。
4. 浮钮：`showBackToBottom` 时在消息区右下渲染一个绝对定位 Button（`↓ 回到底部`），点击 `bottomRef.current?.scrollIntoView({behavior:"smooth"})` 并 `stickToBottomRef.current = true`。容器需 `relative`。

> 注：scroll 监听挂在 effect 里，依赖挂载一次；viewport 元素若因 loading/empty 切换而重建，需重新绑定——用 `messages.length`/`loading` 作为 effect 依赖确保 viewport 存在时再绑。

- [ ] **Step 3: 验证** `npx tsc --noEmit && npx eslint components/ai-chat/` PASS

- [ ] **Step 4: Commit**
```bash
git add components/ai-chat/AiChatMessages.tsx app/globals.css
git commit -m "feat(ai-chat): 助手消息 hover 复制全文 + 回到底部浮钮（贴底才跟随滚动）"
```

---

### Task 5: 数学公式 KaTeX

**Files:**
- Modify: `package.json`（`npm i remark-math rehype-katex katex`）
- Modify: `components/ai-chat/MarkdownRenderer.tsx`（加 remark-math + rehype-katex，katex css）

**Interfaces:**
- Consumes: 现有 remark/rehype 链。
- Produces: `$…$`/`$$…$$` 渲染。

- [ ] **Step 1: 装依赖**
```bash
npm install remark-math rehype-katex katex
```

- [ ] **Step 2: 接插件**

`MarkdownRenderer.tsx`：
1. import 加 `import remarkMath from "remark-math"; import rehypeKatex from "rehype-katex"; import "katex/dist/katex.min.css";`
2. `REMARK_PLUGINS` 改 `[remarkGfm, remarkMath]`。
3. `REHYPE_PLUGINS` 在 Shiki 项之后追加 `[rehypeKatex]`（保持 Shiki 在前）。注意与 Task 3 的 `plain` 降级兼容：`plain` 时 rehype 传 `[rehypeKatex]`（数学仍渲染，只去 Shiki 高亮）——即 `plain ? [rehypeKatex] : REHYPE_PLUGINS`。模块级 `const REHYPE_PLAIN = [rehypeKatex];`。

- [ ] **Step 3: globals.css KaTeX 颜色跟随**（AI 区块）
```css
/* KaTeX 公式颜色跟随前景（暗色可读）。 */
[data-ai-md] .katex { color: var(--foreground); font-size: 1.02em; }
```

- [ ] **Step 4: 验证 + build** `npx tsc --noEmit && npx eslint components/ai-chat/ && npm run build` PASS

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json components/ai-chat/MarkdownRenderer.tsx app/globals.css
git commit -m "feat(ai-chat): KaTeX 数学公式——remark-math+rehype-katex，颜色随 token"
```

---

### Task 6: Mermaid 图（懒加载 + 预设 token 主题）

**Files:**
- Modify: `package.json`（`npm i mermaid`）
- Create: `components/ai-chat/AiMermaid.tsx`（图源 → SVG，DOMPurify 过滤，token 主题）
- Modify: `components/ai-chat/AiCodeBlock.tsx`（`language-mermaid` 分流到 AiMermaid）

**Interfaces:**
- Consumes: Task 2 的 `extractText`/`extractLang`（AiCodeBlock 内）。Mermaid 分流点 = AiCodeBlock 里 `lang === "mermaid"`。
- Produces: `AiMermaid({ code })`。

- [ ] **Step 1: 装依赖**
```bash
npm install mermaid
```

- [ ] **Step 2: 写 AiMermaid.tsx**（懒加载 mermaid + DOMPurify + token 主题）

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

// Mermaid 图：懒加载 mermaid 库，把图源渲成 SVG（DOMPurify 过滤后注入），主题映射项目 token。
// 仅客户端渲染（静态导出无 SSR）；预设/明暗变化经 themeKey 触发重渲。
export function AiMermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined" || !ref.current) return;
      try {
        const mermaid = (await import("mermaid")).default;
        const cs = getComputedStyle(document.documentElement);
        const v = (n: string) => cs.getPropertyValue(n).trim();
        const dark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: v("--muted"),
            primaryTextColor: v("--foreground"),
            primaryBorderColor: v("--border"),
            lineColor: v("--muted-foreground"),
            secondaryColor: v("--surface"),
            tertiaryColor: v("--background"),
            fontFamily: v("--body-font") || "inherit",
          },
          dark,
        });
        const id = `mmd-${Math.abs(hash(code))}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
    // code 变化重渲；主题/明暗切换初版不监听（打开抽屉时按当前主题渲）。
  }, [code]);

  if (error) {
    return <div className="mb-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">图表渲染失败</div>;
  }
  return <div ref={ref} className="ai-md-mermaid mb-2 overflow-x-auto rounded-md border border-border/60 bg-surface p-3" />;
}

// 简单稳定 hash（生成元素 id 用，避免特殊字符）。
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h;
}
```

- [ ] **Step 3: AiCodeBlock 分流 mermaid**

`AiCodeBlock.tsx`：当 `lang === "mermaid"` 时不渲染代码卡、改渲染 `<AiMermaid code={codeText} />`。mermaid 库走 `next/dynamic` 进一步懒加载：
```tsx
import dynamic from "next/dynamic";
const AiMermaid = dynamic(() => import("./AiMermaid").then((m) => ({ default: m.AiMermaid })), { ssr: false });
```
（`AiCodeBlock` 顶部，模块级——`ssr:false` 在 client 组件内合法）。`AiCodeBlock` 的 return 前加：
```tsx
  if (lang === "mermaid") return <AiMermaid code={codeText} />;
```

- [ ] **Step 4: globals.css mermaid 作用域样式**（AI 区块）
```css
/* Mermaid 图内文字随前景；svg 自适应宽度。 */
[data-ai-md] .ai-md-mermaid svg { max-width: 100%; height: auto; }
[data-ai-md] .ai-md-mermaid .nodeLabel, [data-ai-md] .ai-md-mermaid .edgeLabel { color: var(--foreground); }
```

- [ ] **Step 5: 验证 + build** `npx tsc --noEmit && npx eslint components/ai-chat/ && npm run build` PASS

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json components/ai-chat/ app/globals.css
git commit -m "feat(ai-chat): Mermaid 图——```mermaid 分流懒加载渲染，base 主题映射项目 token，DOMPurify 过滤 SVG"
```

---

### Task 7: 全量验证 + README 同步

**Files:**
- Modify: `components/README.md`（ai-chat 条目补内容区能力）

- [ ] **Step 1: 全量验证** `npx tsc --noEmit && npm run lint && npm run build` 全 PASS

- [ ] **Step 2: README 同步**：`components/README.md` 的 `ai-chat/` 条目末尾补：
```markdown
  内容区：GFM 表格/任务列表/引用主题化，代码块卡（复制/语言标签/横向滚动 + Shiki css-var 高亮融入预设 token，流式降级），KaTeX 数学，Mermaid 图（懒加载 + token 主题 + DOMPurify 过滤 SVG），消息级复制全文 + 回到底部浮钮；样式统一 `[data-ai-md]` 作用域。
```

- [ ] **Step 3: Commit**
```bash
git add components/README.md
git commit -m "docs(ai-chat): README 登记内容区 markdown 增强（代码卡/高亮/数学/图/复制/回底）"
```

---

## Self-Review 记录

- **Spec 覆盖**：代码块卡(T2)、复制钮 hover(T2)、语言标签+滚动(T2)、Shiki 融入 token(T3)、GFM 表格/任务列表/引用/hr(T1)、消息复制(T4)、回到底部(T4)、KaTeX(T5)、Mermaid token 主题(T6)——全覆盖。重新生成按决策不做。
- **占位符**：无 TBD。Shiki 的 css-variables 主题在 `defaultColor:false` 下的确切行为留了「以 tsc+运行时为准」的弹性（Step 3 注），这是唯一无法离线 100% 锁死的点，已给退化路径。
- **类型一致**：`MarkdownRenderer` 加 `plain?`(T3)→`AiMarkdown` 透传(T3)→`AiChatMessages` 传 `plain={!!m.pending}`(T3) 一致；`AiCodeBlock({node,children})`(T2) 与 react-markdown `pre` 组件签名一致；`AiMermaid({code})`(T6) 与 AiCodeBlock 分流一致；`extractText/extractLang` 定义于 T2、T6 复用。
- **lint 红线**：组件全模块级（`MD_COMPONENTS`/`CopyMsgBtn`/`AiCodeBlock`/`AiMermaid`）；setState 均在事件/异步回调；`next/dynamic ssr:false` 在 client 组件内；`plain` 降级用模块级 `EMPTY`/`REHYPE_PLAIN` 数组（避免每次渲染新引用触发 unified 重跑）。
- **主题**：全部 token + `[data-ai-md]` 作用域；prose 特异性坑已按 CLAUDE.md 经验用高特异性选择器。
- **依赖账**：shiki/@shikijs/rehype(T3)、remark-math/rehype-katex/katex(T5)、mermaid(T6)，均懒加载；katex css 在懒加载的 MarkdownRenderer 内 import，不进首屏。

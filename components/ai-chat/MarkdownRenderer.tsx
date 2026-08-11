"use client";

import { type ReactNode } from "react";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeShiki from "@shikijs/rehype";
import rehypeKatex from "rehype-katex";
import { createCssVariablesTheme } from "shiki/core";
import { bundledLanguages } from "shiki";
import { visit } from "unist-util-visit";
import type { Node } from "unist";
import type { PluggableList } from "unified";
import { cn } from "@/lib/utils";
import { AiCodeBlock } from "./AiCodeBlock";
// KaTeX 样式随本懒加载模块（AiMarkdown next/dynamic ssr:false）进包，不进首屏 bundle。
import "katex/dist/katex.min.css";

// react-markdown 直接渲染（输出 React 树，XSS 安全）。仅供 AiMarkdown 懒加载封装内部用。

// ---- 模型 fence 笔误容错 -----------------------------------------------------------------
// 模型常把代码 fence 写成 ```html<!DOCTYPE html>… / ```javascriptconst …——语言名后没换行，
// info string 把首行内容吞进语言名：lang 变成 "html<!DOCTYPE"/"javascriptconst"。后果：
// Shiki 拿未知语言不高亮、被吞的首行丢失（显示不全）、复制缺首行。此处容错拆开。
// SHIKI_LANGS：known fence 语言集合（346 种），仅计算一次（进程内缓存）。
const SHIKI_LANGS: ReadonlySet<string> = new Set([
  ...Object.keys(bundledLanguages),
  // 高频 fence 别名（模型爱写）：不属于 shiki grammar key，但应被识别为语言而非内容。
  "vue", "react", "jsx", "tsx", "ts", "js", "py", "rb", "sh", "shell", "bash", "zsh",
  "yml", "yaml", "md", "markdown", "plaintext", "text", "txt", "docker", "makefile",
]);

// 语言别名 → shiki grammar key（拆出别名后映射回真实高亮语言；无映射则保留原名，Shiki 不认识则不高亮）。
const LANG_ALIAS: Record<string, string> = {
  vue: "vue", react: "jsx", ts: "typescript", js: "javascript", py: "python", rb: "ruby",
  sh: "bash", shell: "bash", zsh: "bash", yml: "yaml", md: "markdown",
  plaintext: "text", txt: "text", docker: "dockerfile", makefile: "makefile",
};

// 把 lang 规范化为 shiki 可识别的语言（别名 → grammar key）；未知原样返回。
function normalizeLang(lang: string): string {
  const lower = lang.toLowerCase();
  if (SHIKI_LANGS.has(lower) && LANG_ALIAS[lower]) return LANG_ALIAS[lower];
  return lang;
}

// remark transformer（mdast 阶段）：修正 code 节点的 lang 与 value。
// 1) 容错拆分：lang 以某已知语言开头但其后还拼了内容（```html<!DOCTYPE）→ 拆出语言 + 被吞部分补回代码开头。
// 2) 别名归一：lang 是已知别名（```ts ```py）→ 映射到 shiki grammar key，恢复高亮。
function remarkMendFence() {
  return (tree: Node) => {
    visit(tree, "code", (node: Node & { lang?: string | null; value?: string }) => {
      const lang = node.lang;
      if (!lang || typeof node.value !== "string") return;
      const lower = lang.toLowerCase();
      if (SHIKI_LANGS.has(lower)) {
        // 已是合法语言：仅别名归一（ts→typescript 等），value 不动。
        node.lang = normalizeLang(lang);
        return;
      }
      // 找「已知语言前缀 + 拼接内容」：取能整除 lang 前缀的最长已知语言。
      let splitAt = -1;
      let matched = "";
      for (const cand of SHIKI_LANGS) {
        if (lower.startsWith(cand) && cand.length > matched.length) {
          matched = cand;
          splitAt = cand.length;
        }
      }
      if (splitAt < 0) return; // 不含已知语言前缀：保持原样（Shiki 不高亮，但不臆改）。
      const swallowed = lang.slice(splitAt); // 被吞进语言名的首行内容片段。
      node.lang = normalizeLang(matched);
      node.value = swallowed + node.value; // 补回（原 value 首行缺了这部分 + 换行）。
    });
  };
}

// 提升到模块作用域：每次渲染新建 [remarkGfm] 会让 unified 因插件引用变化而重跑管线，
// 导致已落定（非流式）的 markdown 消息也被无谓重解析。
// remarkMath 在 remark 侧解析 $…$ / $$…$$ 为 math 节点，交给 rehype-katex 渲染。
// remarkMendFence 修模型 fence 笔误（见上），须在 Shiki 前把 lang 修正。
const REMARK_PLUGINS: PluggableList = [remarkGfm, remarkMath, remarkMendFence];

// Shiki 高亮：css-variables 主题把 token 颜色发成 var(--shiki-*)，实际取值由
// app/globals.css [data-ai-md] 的 token 映射决定（随 5 预设 × 明暗）。
// 单主题直发 color:var(--shiki-token-*)——亮暗同值（token 本身随 .dark 变），
// 无需 dual themes + --shiki-light/dark 双变量那套额外切换 CSS。
// 注：shiki v4 中 "css-variables" 已非内置字符串主题，须用 createCssVariablesTheme() 工厂。
// addLanguageClass: 把 language-xxx 类加回 <code>，AiCodeBlock 的语言标签提取依赖它。
// 不设 fallbackLanguage/defaultLanguage：未知/无语言代码块保持原样（不高亮、标签正确）。
// 模块级常量：主题/插件数组引用稳定，避免 unified 因引用变化重跑管线（已落定消息被重高亮）。
// 顺序关键：Shiki 必须先于 KaTeX——Shiki 只处理代码节点，先跑可避免它触碰 math 节点；
// rehype-katex 随后把 remark-math 产出的 math 节点渲染为 .katex。
const SHIKI_THEME = createCssVariablesTheme({ variablePrefix: "--shiki-" });
const REHYPE_PLUGINS: PluggableList = [
  [rehypeShiki, { theme: SHIKI_THEME, addLanguageClass: true }],
  rehypeKatex,
];
// 流式降级：pending 消息内容每帧变，跑 Shiki 会每帧重高亮；仅跳过 Shiki（代码卡仍在，仅无着色）。
// 数学仍渲染——KaTeX 开销远低于 Shiki，流式期保留公式可读性。
const REHYPE_PLAIN: PluggableList = [rehypeKatex];

// GFM 排版适配：表格横向滚动包裹；hr 主题化。模块级常量（避开 react-hooks/static-components）。
// 表格包装在落定/流式两种组件表间共享，定义一次引用两处（DRY）。
// react-markdown v10 仍传 hast node（passNode:true）；本 table 包装不需要，仅剥离防污染 DOM。
const MdTable = ({ node: _node, className, children, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => {
  void _node; // 剥离 react-markdown 传入的 hast node，避免落进 ...props 污染 DOM
  return (
    <div className="ai-md-table-wrap overflow-x-auto">
      <table className={className} {...props}>{children}</table>
    </div>
  );
};

// 落定/流式两条管线的 rehype 链 + 组件表对应（REHYPE_PLUGINS↔MD_COMPONENTS、REHYPE_PLAIN↔MD_COMPONENTS_PLAIN）。
const MD_COMPONENTS = {
  table: MdTable,
  pre: ({ node, children }: { node?: unknown; children?: ReactNode }) => (
    <AiCodeBlock node={node}>{children}</AiCodeBlock>
  ),
};

// 流式降级组件表（pending）：mermaid 不分流成图（fence 未闭合的半截图源每 chunk 触发
// AiMermaid 重渲染，错误卡闪烁 + 布局抖动），按普通代码卡渲染；落定（plain→false）后换 MD_COMPONENTS 自动出图。
// 与 REHYPE_PLAIN 配套：KaTeX 仍在，仅无 Shiki 着色 + 无 mermaid 图。
const MD_COMPONENTS_PLAIN = {
  table: MdTable,
  pre: ({ node, children }: { node?: unknown; children?: ReactNode }) => (
    <AiCodeBlock allowMermaid={false} node={node}>{children}</AiCodeBlock>
  ),
};

export function MarkdownRenderer({
  content,
  className,
  plain,
}: {
  content: string;
  className?: string;
  /** 流式降级：true 时跳过 Shiki 高亮（pending 每帧重跑太贵），落定后恢复高亮。 */
  plain?: boolean;
}) {
  // 异步高亮（@shikijs/rehype transformer 是 async）让 react-markdown 默认 Markdown(runSync) 必抛
  // `runSync finished async`。改用官方 MarkdownHooks——内部 processor.run() 异步跑管线，支持 async 插件。
  // 代价：每次 render 都 createProcessor 新建（每条消息首次高亮时初始化一次 Shiki 单例），换取官方 async 支持。
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
      {/* fallback：树未就绪（异步管线首跑/内容变化）时先显原文——流式期即逐字增长的打字机文本。 */}
      <MarkdownHooks
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={plain ? REHYPE_PLAIN : REHYPE_PLUGINS}
        components={plain ? MD_COMPONENTS_PLAIN : MD_COMPONENTS}
        fallback={content}
      >
        {content}
      </MarkdownHooks>
    </div>
  );
}

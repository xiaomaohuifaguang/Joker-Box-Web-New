"use client";

import { type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeShiki from "@shikijs/rehype";
import rehypeKatex from "rehype-katex";
import { createCssVariablesTheme } from "shiki/core";
import type { PluggableList } from "unified";
import { cn } from "@/lib/utils";
import { AiCodeBlock } from "./AiCodeBlock";
// KaTeX 样式随本懒加载模块（AiMarkdown next/dynamic ssr:false）进包，不进首屏 bundle。
import "katex/dist/katex.min.css";

// react-markdown 直接渲染（输出 React 树，XSS 安全）。仅供 AiMarkdown 懒加载封装内部用。

// 提升到模块作用域：每次渲染新建 [remarkGfm] 会让 unified 因插件引用变化而重跑管线，
// 导致已落定（非流式）的 markdown 消息也被无谓重解析。
// remarkMath 在 remark 侧解析 $…$ / $$…$$ 为 math 节点，交给 rehype-katex 渲染。
const REMARK_PLUGINS = [remarkGfm, remarkMath];

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

// 落定态组件表：代码块卡（复制/语言标签/滚动 + mermaid 分流成图）。
// node = hast pre 节点，AiCodeBlock 用它提取语言/源码。
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
      <Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={plain ? REHYPE_PLAIN : REHYPE_PLUGINS} components={plain ? MD_COMPONENTS_PLAIN : MD_COMPONENTS}>{content}</Markdown>
    </div>
  );
}

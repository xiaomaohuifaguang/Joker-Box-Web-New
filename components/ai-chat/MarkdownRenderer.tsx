"use client";

import { type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { createCssVariablesTheme } from "shiki/core";
import type { PluggableList } from "unified";
import { cn } from "@/lib/utils";
import { AiCodeBlock } from "./AiCodeBlock";

// react-markdown 直接渲染（输出 React 树，XSS 安全）。仅供 AiMarkdown 懒加载封装内部用。

// 提升到模块作用域：每次渲染新建 [remarkGfm] 会让 unified 因插件引用变化而重跑管线，
// 导致已落定（非流式）的 markdown 消息也被无谓重解析。
const REMARK_PLUGINS = [remarkGfm];

// Shiki 高亮：css-variables 主题把 token 颜色发成 var(--shiki-*)，实际取值由
// app/globals.css [data-ai-md] 的 token 映射决定（随 5 预设 × 明暗）。
// 单主题直发 color:var(--shiki-token-*)——亮暗同值（token 本身随 .dark 变），
// 无需 dual themes + --shiki-light/dark 双变量那套额外切换 CSS。
// 注：shiki v4 中 "css-variables" 已非内置字符串主题，须用 createCssVariablesTheme() 工厂。
// addLanguageClass: 把 language-xxx 类加回 <code>，AiCodeBlock 的语言标签提取依赖它。
// 不设 fallbackLanguage/defaultLanguage：未知/无语言代码块保持原样（不高亮、标签正确）。
// 模块级常量：主题/插件数组引用稳定，避免 unified 因引用变化重跑管线（已落定消息被重高亮）。
const SHIKI_THEME = createCssVariablesTheme({ variablePrefix: "--shiki-" });
const REHYPE_PLUGINS: PluggableList = [
  [rehypeShiki, { theme: SHIKI_THEME, addLanguageClass: true }],
];
// 流式降级：pending 消息内容每帧变，跑 Shiki 会每帧重高亮；传空表跳过（代码卡仍在，仅无着色）。
const EMPTY: PluggableList = [];

// GFM 排版适配：表格横向滚动包裹；hr 主题化。模块级常量（避开 react-hooks/static-components）。
// 语言标签/复制等的 pre 映射在后续 Task 加入本对象。
const MD_COMPONENTS = {
  // 表格包一层可横向滚动的容器（窄抽屉不溢出）。
  // react-markdown v10 仍传 hast node（passNode:true）；本 table 包装不需要，仅剥离防污染 DOM。后续 pre 组件会用 node 提取语言/源码。
  table: ({ node: _node, className, children, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => {
    void _node; // 剥离 react-markdown 传入的 hast node，避免落进 ...props 污染 DOM
    return (
      <div className="ai-md-table-wrap overflow-x-auto">
        <table className={className} {...props}>{children}</table>
      </div>
    );
  },
  // 代码块卡（复制/语言标签/滚动）。node = hast pre 节点，AiCodeBlock 用它提取语言/源码。
  pre: ({ node, children }: { node?: unknown; children?: ReactNode }) => (
    <AiCodeBlock node={node}>{children}</AiCodeBlock>
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
      <Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={plain ? EMPTY : REHYPE_PLUGINS} components={MD_COMPONENTS}>{content}</Markdown>
    </div>
  );
}

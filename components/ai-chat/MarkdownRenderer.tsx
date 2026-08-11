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
  // react-markdown v10 不再给组件传 node（类型上标 node?: unknown 兼容旧签名）。
  table: ({ className, children, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => (
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

"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// 懒加载 react-markdown（~45KB，仅打开抽屉渲染消息时才下载），加载期回退纯文本。
// ssr:false 只能写在 client 组件内（本文件即 client）。静态导出下无 SSR，此选项只为
// 强制客户端 code-split，避免 markdown 进首屏 bundle。
const MarkdownRenderer = dynamic(
  () =>
    import("./MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
  { ssr: false },
);

// Markdown 渲染出口：content 为 assistant 消息的 markdown 文本。
export function AiMarkdown({
  content,
  className,
  plain,
}: {
  content: string;
  className?: string;
  /** 流式降级：pending 时跳过 Shiki 高亮（透传给 MarkdownRenderer）。 */
  plain?: boolean;
}) {
  if (!content) return null;
  return <MarkdownRenderer content={content} className={cn("text-sm", className)} plain={plain} />;
}

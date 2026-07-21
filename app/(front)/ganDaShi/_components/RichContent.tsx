"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

// 富文本内容渲染：DOMPurify 过滤（防 XSS）+ prose 排版。
// DOMPurify 仅在客户端（有 window）执行 -- 静态导出预渲染无 DOM，服务端跑会抛错，
// 故 typeof window === "undefined" 时回退原 html（预渲染时 html 为空，无安全风险）。
// className 可传 prose-sm（评论用，更紧凑）等覆盖。
export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const sanitized = useMemo(() => {
    if (!html) return "";
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html);
  }, [html]);
  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

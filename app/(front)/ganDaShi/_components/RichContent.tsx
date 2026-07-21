"use client";

import { useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

// 富文本内容渲染：DOMPurify 过滤（防 XSS）+ prose 排版。
// DOMPurify 仅在客户端（有 window）执行 -- 静态导出预渲染无 DOM，服务端跑会抛错，
// 故 typeof window === "undefined" 时回退原 html（预渲染时 html 为空，无安全风险）。
// className 可传 prose-sm（评论用，更紧凑）等覆盖。
//
// 图片窄屏自适应：可缩放图片存的是内联 width/height px（特异性高于 prose-img utility）。
// 宽屏下按用户拖的 w/h（含变形）显示；当容器比图片 width 窄、宽被 max-width 压缩时，
// 清掉内联 height 让浏览器按宽度等比换算 -> 不溢出、不压扁（保比例）。
export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sanitized = useMemo(() => {
    if (!html) return "";
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html);
  }, [html]);

  // 窄屏检测：图片渲染宽 < 其内联 width 时，说明被 max-width 压缩 -> 清内联 height 回等比。
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll("img"));
    const adjust = () => {
      for (const img of imgs) {
        const inlineW = parseFloat(img.style.width || "");
        if (!inlineW) continue; // 无内联 width 的普通图不处理
        const compressed = img.getBoundingClientRect().width < inlineW - 1;
        if (compressed) {
          img.style.height = "auto"; // 宽被压 -> 高回等比
        } else if (img.style.height === "auto") {
          // 回到宽屏：还原内联 height（从 attr 里读不到原值，故初始存 data 属性）。
          const orig = img.dataset.origHeight;
          if (orig) img.style.height = orig;
        }
      }
    };
    // 首次渲染先备份原内联 height，再按当前容器判断。
    for (const img of imgs) {
      if (img.style.height && img.style.height !== "auto" && !img.dataset.origHeight) {
        img.dataset.origHeight = img.style.height;
      }
    }
    adjust();
    const ro = new ResizeObserver(adjust);
    ro.observe(root);
    return () => ro.disconnect();
  }, [sanitized]);

  return (
    <div
      ref={ref}
      data-rich-content=""
      className={cn(
        "prose dark:prose-invert max-w-none prose-img:rounded-lg prose-img:max-w-full",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

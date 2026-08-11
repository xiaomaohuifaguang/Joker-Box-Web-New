"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

// Mermaid 图：懒加载 mermaid 库，把图源渲成 SVG（DOMPurify 过滤后注入），base 主题映射项目 token。
// 仅客户端渲染（静态导出无 SSR）；token 渲染时经 getComputedStyle 读取，随当前预设/明暗。
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
        // 无 --muted 原始 token（@theme 里 --color-muted 映射 --surface），主色直接用 --surface。
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          darkMode: document.documentElement.classList.contains("dark"),
          themeVariables: {
            primaryColor: v("--surface"),
            primaryTextColor: v("--foreground"),
            primaryBorderColor: v("--border"),
            lineColor: v("--muted-foreground"),
            secondaryColor: v("--background"),
            tertiaryColor: v("--surface"),
            fontFamily: v("--body-font") || "inherit",
          },
        });
        const id = `mmd-${Math.abs(hash(code))}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // code 变化重渲；主题/明暗切换初版不监听（打开抽屉时按当前主题渲）。
  }, [code]);

  if (error) {
    return (
      <div className="mb-2 rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
        图表渲染失败
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className="ai-md-mermaid mb-2 overflow-x-auto rounded-md border border-border/60 bg-surface p-3"
    />
  );
}

// 简单稳定 hash（生成元素 id 用，避免特殊字符）。
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

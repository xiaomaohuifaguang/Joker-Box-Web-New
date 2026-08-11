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

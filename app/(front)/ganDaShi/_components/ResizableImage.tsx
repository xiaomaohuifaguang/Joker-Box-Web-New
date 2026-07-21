"use client";

import { useRef } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import { cn } from "@/lib/utils";

// 可缩放图片扩展：
// - 加 width 属性（映射 style: width），存进 content（<img style="width: 50%">）。
// - 自定义 NodeView：点击图片选中 -> 右下角拖拽手柄 -> 实时改 width%（RAF 节流）。
export const ResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.width || null,
        renderHTML: ({ width }) => (width ? { style: `width: ${width}` } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const width = (node.attrs.width as string | null) || undefined;

  // 拖拽右下角手柄：按容器宽度算百分比（10%-100%），RAF 节流 updateAttributes。
  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const container = imgRef.current?.closest(".ProseMirror") as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let rafId = 0;
    let lastPct = 0;

    function onMove(ev: MouseEvent) {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      lastPct = Math.max(10, Math.min(100, Math.round(pct)));
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          updateAttributes({ width: `${lastPct}%` });
        });
      }
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId) cancelAnimationFrame(rafId);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <NodeViewWrapper className="relative inline-block" style={{ width }}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        className={cn(
          "h-auto max-w-full rounded-lg",
          selected && "ring-2 ring-brand",
        )}
        draggable={false}
      />
      {selected && (
        <div
          onMouseDown={startResize}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border-2 border-brand bg-background"
          aria-label="拖拽缩放"
        />
      )}
    </NodeViewWrapper>
  );
}

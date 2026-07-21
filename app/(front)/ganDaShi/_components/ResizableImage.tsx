"use client";

import { useRef } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import { NodeSelection } from "@tiptap/pm/state";
import { cn } from "@/lib/utils";

// 可缩放可混排图片扩展（inline 图文同行 + allowBase64 base64 内联）。
// - width/height 都存 px 数值（拖拽/提交/回显统一单位，不会预览与提交不一致而乱跳）。
// - 8 圆饼手柄（NodeSelection 选中图片时显示）：4 角等比、E/W 边中点横向、N/S 边中点纵向（边中点 -> 变形）。
//   手柄相对 wrapper 定位，wrapper 自然包裹图片 -> 严格贴图片边缘。
//   拖拽走 ProseMirror 事务更新属性（不直接改 DOM）-> 手柄与图片永远同步；NodeSelection 锚定 -> 选区不跳。
export const ResizableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // width：px 数值。parseHTML 读 style.width 的 px。
      width: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).style.width;
          return v.endsWith("px") ? Math.round(parseFloat(v)) : null;
        },
      },
      // height：px 数值。parseHTML 读 style.height 的 px。
      height: {
        default: null,
        parseHTML: (el) => {
          const v = (el as HTMLElement).style.height;
          return v.endsWith("px") ? Math.round(parseFloat(v)) : null;
        },
      },
    };
  },
  // 扩展级 renderHTML：合并 width/height 为单个 style（避免各 attribute 的 style 互相覆盖），
  // 并补 display:inline + vertical-align:middle -> 序列化出的 <img> 在详情页与文字同行、基线对齐。
  renderHTML({ HTMLAttributes }) {
    const { width, height, ...rest } = HTMLAttributes as {
      width?: number | null;
      height?: number | null;
    } & Record<string, unknown>;
    const style = [
      width ? `width: ${width}px` : "",
      height ? `height: ${height}px` : "",
      "display: inline-block",
      "vertical-align: middle",
    ]
      .filter(Boolean)
      .join("; ");
    return ["img", { ...rest, style }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

const MIN_WIDTH_PX = 40;
const MIN_HEIGHT_PX = 24;

// 方向 -> 缩放模式：corner(4角)=等比；e/w=仅横向；n/s=仅纵向（单轴变形，另一轴不动）。
type Mode = "corner" | "horizontal" | "vertical";

function modeOf(dir: string): Mode {
  if (dir.length === 2) return "corner"; // nw/ne/sw/se
  return dir === "e" || dir === "w" ? "horizontal" : "vertical"; // e/w/n/s
}

function ImageView({ node, editor, getPos, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  // attrs 是 px 数值 -> style 直接用（React 对 number 自动加 px）。
  const width = (node.attrs.width as number | null) ?? undefined;
  const height = (node.attrs.height as number | null) ?? undefined;

  function startResize(dir: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img || typeof getPos !== "function") return;
    const startPos = getPos();
    if (startPos == null) return;

    // 选中图片节点（NodeSelection）：高亮 + 手柄锚定，PM 重渲染时选区稳定。
    editor.commands.command(({ tr, dispatch }) => {
      if (dispatch) tr.setSelection(NodeSelection.create(tr.doc, startPos));
      return true;
    });

    const startRect = img.getBoundingClientRect();
    const startW = startRect.width || 1;
    const startH = startRect.height || 1;
    const aspect = startW / startH;
    const maxW = img.closest(".ProseMirror")?.clientWidth || startW;
    const mode = modeOf(dir);

    function onMove(ev: MouseEvent) {
      // 位移量（按方向取符号：e/s 正向，w/n 反向）。
      const dx = dir.includes("e")
        ? ev.clientX - startRect.right
        : dir.includes("w")
          ? startRect.left - ev.clientX
          : 0;
      const dy = dir.includes("s")
        ? ev.clientY - startRect.bottom
        : dir.includes("n")
          ? startRect.top - ev.clientY
          : 0;

      let w = startW;
      let h = startH;
      if (mode === "horizontal") {
        w = startW + dx; // 仅横向，高度不变 -> 变形
      } else if (mode === "vertical") {
        h = startH + dy; // 仅纵向，宽度不变 -> 变形
      } else {
        // corner：等比。以横向为主（位移小则退回纵向），scale 随鼠标距离线性变化 -> 平滑无突跳。
        const useX = Math.abs(dx) >= Math.abs(dy) * aspect || Math.abs(dy) < 1;
        const scale = useX ? (startW + dx) / startW : (startH + dy) / startH;
        w = startW * scale;
        h = startH * scale;
      }
      w = Math.round(Math.max(MIN_WIDTH_PX, Math.min(maxW, w)));
      h = Math.round(Math.max(MIN_HEIGHT_PX, h));

      const pos = typeof getPos === "function" ? getPos() : null;
      if (pos == null) return;
      editor.commands.command(({ tr, dispatch }) => {
        if (dispatch) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, width: w, height: h });
        }
        return true;
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // wrapper 自然包裹图片；图片 margin 由 globals.css 里 [data-node-view-wrapper] img 规则清掉
  // （.prose img 的 2em margin 特异性高于 my-0，utility 压不掉，需 CSS 覆盖）。
  return (
    <NodeViewWrapper as="span" className="relative inline-block max-w-full align-middle leading-none">
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt}
        style={{ width, height }}
        className={cn("block max-w-full rounded-lg", selected && "ring-2 ring-brand/40")}
        draggable={false}
      />
      {/* 8 圆饼手柄：相对 wrapper（=图片）边缘定位。4 边中点（e/w 横向、n/s 纵向）+ 4 角（等比）。 */}
      {selected && (
        <>
          <Handle dir="n" className="left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" cursor="ns-resize" onStart={startResize} />
          <Handle dir="s" className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" cursor="ns-resize" onStart={startResize} />
          <Handle dir="e" className="right-0 top-1/2 -translate-y-1/2 translate-x-1/2" cursor="ew-resize" onStart={startResize} />
          <Handle dir="w" className="left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" cursor="ew-resize" onStart={startResize} />
          <Handle dir="nw" className="left-0 top-0 -translate-x-1/2 -translate-y-1/2" cursor="nwse-resize" onStart={startResize} />
          <Handle dir="ne" className="right-0 top-0 -translate-y-1/2 translate-x-1/2" cursor="nesw-resize" onStart={startResize} />
          <Handle dir="se" className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" cursor="nwse-resize" onStart={startResize} />
          <Handle dir="sw" className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" cursor="nesw-resize" onStart={startResize} />
        </>
      )}
    </NodeViewWrapper>
  );
}

// 圆饼手柄：absolute + cursor，相对 wrapper 定位 -> 贴图片边缘跟手。
function Handle({
  dir,
  className,
  cursor,
  onStart,
}: {
  dir: string;
  className: string;
  cursor: string;
  onStart: (dir: string, e: React.MouseEvent) => void;
}) {
  return (
    <div
      onMouseDown={(e) => onStart(dir, e)}
      className={cn(
        "absolute z-10 h-2.5 w-2.5 rounded-full border border-brand bg-background shadow-sm",
        className,
      )}
      style={{ cursor }}
    />
  );
}

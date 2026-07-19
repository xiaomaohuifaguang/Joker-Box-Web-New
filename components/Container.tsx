import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 前台内容容器：流式宽度（85%）+ 上限 1920px，平滑适配各分辨率（笔记本/1080p/2K/4K）。
// className 可覆盖默认（如 max-w-4xl 收窄、加 py/flex 等），tailwind-merge 自动处理冲突。
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-[85%] max-w-[1600px]", className)}>{children}</div>;
}

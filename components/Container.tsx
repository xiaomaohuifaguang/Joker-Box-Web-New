import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 前台内容容器：小屏顶满（仅留 padding 呼吸边距），随屏宽加大边距，1600px 封顶固定。
// className 可覆盖默认（如 max-w-4xl 收窄、加 py/flex 等），tailwind-merge 自动处理冲突。
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

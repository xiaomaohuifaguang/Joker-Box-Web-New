import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 合并 className：clsx 处理条件，tailwind-merge 解决冲突类（如 px-2 px-4 -> px-4）。
// shadcn 组件也从此 import cn。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

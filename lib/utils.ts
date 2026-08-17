import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 合并 className：clsx 处理条件，tailwind-merge 解决冲突类（如 px-2 px-4 -> px-4）。
// shadcn 组件也从此 import cn。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 随机 id（客户端运行时标识用：表单 fieldId/clientId、选项、表格列、流程节点 id 后缀等）。
// crypto.randomUUID 是安全上下文(Secure Context)限定 API——nginx 部署走 http://<内网IP/域名>
// 非安全上下文时没有它 → 退回 时间戳+随机数。仅作运行时唯一标识，勿用于安全/令牌场景。
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

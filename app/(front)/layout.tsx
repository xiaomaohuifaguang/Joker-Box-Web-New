import type { ReactNode } from "react";
import { FrontShell } from "./_components/FrontShell";

// 前台布局：外壳抽在 FrontShell（top/side 双模式，约定见该文件），
// 供本 layout 与 NotFoundPage（全局 404 不在路由组布局内）共用。
export default function FrontLayout({ children }: { children: ReactNode }) {
  return <FrontShell>{children}</FrontShell>;
}

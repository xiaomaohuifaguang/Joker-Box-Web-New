"use client";

import type { ReactNode } from "react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { ConsoleSidebar } from "./_components/ConsoleSidebar";

// 后台布局：所有 /console/* 都经 <RequireAdmin>（登录 + admin）守卫。
// app-shell：侧栏固定全高，主区内部滚动。
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="flex h-screen overflow-hidden">
        <ConsoleSidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </RequireAdmin>
  );
}

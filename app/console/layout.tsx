"use client";

import type { ReactNode } from "react";
import { AiChatWidget } from "@/components/ai-chat/AiChatWidget";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { CommandMenu } from "@/components/CommandMenu";
import { RequireAdmin } from "@/components/RequireAdmin";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConsoleBreadcrumb } from "./_components/ConsoleBreadcrumb";
import { ConsoleSidebar } from "./_components/ConsoleSidebar";

// 后台布局：所有 /console/* 都经 <RequireAdmin>（登录 + admin）守卫。
// app-shell（shadcn Sidebar）：侧栏 + 主区；主区顶栏放触发钮（桌面折叠 / 移动抽屉）、面包屑、
// 全局搜索和外观设置。主区内部滚动，侧栏固定全高。
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <SidebarProvider className="h-svh overflow-hidden">
        <ConsoleSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger />
              </TooltipTrigger>
              <TooltipContent>切换侧栏</TooltipContent>
            </Tooltip>
            <ConsoleBreadcrumb />
            <div className="ml-auto flex items-center gap-2">
              <CommandMenu />
              <AppearanceMenu />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </SidebarInset>
        {/* raised：后台表格分页条右对齐在视口右下，FAB 抬高避开（前台保持 bottom-6）。 */}
        <AiChatWidget raised />
      </SidebarProvider>
    </RequireAdmin>
  );
}

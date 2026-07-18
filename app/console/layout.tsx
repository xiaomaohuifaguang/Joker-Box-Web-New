"use client";

import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { ThemeSelect } from "@/components/ThemeSelect";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/useTheme";
import { ConsoleBreadcrumb } from "./_components/ConsoleBreadcrumb";
import { ConsoleSidebar } from "./_components/ConsoleSidebar";

// 后台布局：所有 /console/* 都经 <RequireAdmin>（登录 + admin）守卫。
// app-shell（shadcn Sidebar）：侧栏 + 主区；主区顶栏放触发钮（桌面折叠 / 移动抽屉）
// 与主题预设 + 明暗切换；也为后续面包屑留位。主区内部滚动，侧栏固定全高。
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const { scheme, toggleScheme } = useTheme();
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
              <ThemeSelect />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleScheme}
                    aria-label={scheme === "dark" ? "切换浅色模式" : "切换深色模式"}
                    className="text-muted-foreground"
                  >
                    {scheme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {scheme === "dark" ? "切换浅色" : "切换深色"}
                </TooltipContent>
              </Tooltip>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </RequireAdmin>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { AiChatWidget } from "@/components/ai-chat/AiChatWidget";
import { LayoutToggle } from "@/components/LayoutToggle";
import { SystemPromptBanner } from "@/components/SystemPromptBanner";
import { ThemeSelect } from "@/components/ThemeSelect";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useFrontLayout } from "@/hooks/useFrontLayout";
import { useMounted } from "@/hooks/useMounted";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";
import { FrontSidebar } from "./_components/FrontSidebar";
import { UserMenu } from "./_components/UserMenu";

// 前台布局：两种模式可切换（lib/front-layout 持久化，LayoutToggle 切换）：
// - top（默认）：Header + 公告横幅 + main（文档流滚动）+ Footer + AI 助手。
// - side：仿后台 app-shell（SidebarProvider + FrontSidebar + SidebarInset），
//   inset 顶栏放触发钮/主题/布局切换/用户入口，主区内部容器滚动，Footer 在滚动区底部。
// useMounted 门控：布局存 localStorage（client-only），首帧渲染占位避免顶栏->侧栏跳变。
// --front-chrome-h：顶栏模式 sticky/scroll 偏移 = Header 高（4rem）；侧栏模式 inset 顶栏
// 在滚动区外，sticky 相对容器顶只需小缓冲（0.5rem）。供 website 等页使用。
export default function FrontLayout({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const { layout } = useFrontLayout();
  const { scheme, toggleScheme } = useTheme();
  const { authenticated } = useAuth();

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  if (layout === "side") {
    return (
      <SidebarProvider
        className="h-svh overflow-hidden"
        style={{ "--front-chrome-h": "0.5rem" } as CSSProperties}
      >
        <FrontSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger />
              </TooltipTrigger>
              <TooltipContent>切换侧栏</TooltipContent>
            </Tooltip>
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
              <LayoutToggle />
              {authenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/register">注册</Link>
                  </Button>
                  <Button asChild variant="default" size="sm">
                    <Link href="/login">登录</Link>
                  </Button>
                </>
              )}
            </div>
          </header>
          <SystemPromptBanner />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </div>
        </SidebarInset>
        {/* raised：侧栏模式主区内滚动，FAB 抬高与后台保持一致。 */}
        <AiChatWidget raised />
      </SidebarProvider>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--front-chrome-h": "4rem" } as CSSProperties}
    >
      <Header />
      <SystemPromptBanner />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <AiChatWidget />
    </div>
  );
}

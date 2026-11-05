"use client";

import Link from "next/link";
import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { SidebarUserMenu } from "@/components/app-shell/SidebarUserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MENU_TYPE } from "@/types";

// 前台侧栏（side 布局）：菜单 menuType=-2，首页常驻首位。
// 未登录时底部放登录/注册（折叠图标态隐藏，inset 顶栏仍有入口）。
export function FrontSidebar() {
  const { authenticated } = useAuth();
  return (
    <AppSidebar
      menuType={MENU_TYPE.FRONT}
      homeHref="/"
      subtitle="一站式工作台"
      pinHome
      footer={
        authenticated ? (
          <SidebarUserMenu context="front" />
        ) : (
          <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:hidden">
            <Button asChild size="sm">
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/register">注册</Link>
            </Button>
          </div>
        )
      }
    />
  );
}

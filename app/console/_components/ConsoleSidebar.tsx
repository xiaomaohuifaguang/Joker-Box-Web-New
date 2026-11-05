"use client";

import { AppSidebar } from "@/components/app-shell/AppSidebar";
import { SidebarUserMenu } from "@/components/app-shell/SidebarUserMenu";
import { MENU_TYPE } from "@/types";

// 后台侧栏：菜单 menuType=-1（后端按 token 过滤），Logo 回仪表盘。
export function ConsoleSidebar() {
  return (
    <AppSidebar
      menuType={MENU_TYPE.CONSOLE}
      homeHref="/console"
      subtitle="管理后台"
      footer={<SidebarUserMenu context="console" />}
    />
  );
}

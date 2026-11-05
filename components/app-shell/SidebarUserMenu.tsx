"use client";

import { ChevronsUpDown } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/UserAvatar";
import { UserMenuDropdown } from "@/components/user-menu/UserMenuDropdown";
import { useUserDisplay } from "@/hooks/useUserDisplay";

// 侧栏底部的用户入口（向上展开）。
export function SidebarUserMenu({ context }: { context: "front" | "console" }) {
  const { user, name, initials } = useUserDisplay();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserMenuDropdown context={context} side="top">
          <SidebarMenuButton
            size="lg"
            tooltip={name}
            className="text-foreground data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:p-1!"
          >
            <UserAvatar
              userId={user?.userId}
              initials={initials}
              className="h-8 w-8 shrink-0 rounded-lg"
              fallbackClassName="rounded-lg bg-brand-2 text-xs text-background"
            />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">
                @{user?.username ?? "-"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </UserMenuDropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

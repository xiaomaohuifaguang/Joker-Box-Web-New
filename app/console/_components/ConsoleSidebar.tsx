"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronsUpDown } from "lucide-react";
import { MenuIcon } from "@/components/menuIcons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useUser } from "@/hooks/useUser";
import { MENU_TYPE } from "@/types";

// 顶级菜单图标取 menu.icon 字段（MenuIcon 渲染，空/未知兜底 LayoutGrid）。

// 后台侧边栏（shadcn Sidebar）：菜单由后端 /menu/menuTree(menuType=-1) 驱动，
// useMenuTree 按 whiteList + authPaths 过滤。可折叠图标栏 + 移动端 Sheet + 折叠 tooltip。
export function ConsoleSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser();
  const { menu, loading } = useMenuTree(MENU_TYPE.CONSOLE);
  const { state, isMobile } = useSidebar();

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";

  return (
    <Sidebar collapsible="icon">
      {/* 上：logo（点回仪表盘）*/}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/console">
                <span
                  className="flex h-7 w-6 flex-col items-center justify-center rounded-[3px] border leading-none"
                  aria-hidden="true"
                >
                  <span className="font-display text-[10px] font-bold">J</span>
                  <span className="text-[11px] leading-none text-brand">♠</span>
                </span>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span data-slot="logo-text" className="font-display truncate font-semibold">
                    Joker Box
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    管理后台
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 中：菜单（父项用 Collapsible；当前路由所在组默认展开）*/}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : (
                (menu ?? []).map((item) => {
                  const active = pathname.startsWith(item.path);

                  if (!item.children?.length) {
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.path}
                          tooltip={item.name}
                        >
                          <Link href={item.path}>
                            <MenuIcon name={item.icon ?? ""} />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  if (state === "collapsed" && !isMobile) {
                    // 折叠态：点开向右浮层，子项自动关闭并跳转
                    return (
                      <SidebarMenuItem key={item.path}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton isActive={active}>
                              <MenuIcon name={item.icon ?? ""} />
                              <span>{item.name}</span>
                              <ChevronRight className="ml-auto" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="right"
                            align="start"
                            className="w-52"
                          >
                            <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {item.children.map((child) => (
                              <DropdownMenuItem asChild key={child.path}>
                                <Link href={child.path}>{child.name}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <Collapsible
                      key={item.path}
                      asChild
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.name}>
                            <MenuIcon name={item.icon ?? ""} />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => {
                              const childActive =
                                pathname === child.path ||
                                pathname.startsWith(child.path + "/");
                              return (
                                <SidebarMenuSubItem key={child.path}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={childActive}
                                  >
                                    <Link href={child.path}>
                                      <span>{child.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 下：用户菜单（向上展开）—— 用户信息 / 返回前台 / 退出登录 */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={name}
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-felt font-display text-xs text-background">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      @{user?.username ?? "-"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold leading-none">
                        {name}
                      </span>
                      {user?.admin && <Badge>管理员</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      @{user?.username ?? "-"}
                    </span>
                    {user?.mail && (
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {user.mail}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">返回前台</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronsUpDown, Home, LogOut, Mail } from "lucide-react";
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
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [confirmLogout, setConfirmLogout] = useState(false);

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
                  <UserAvatar
                    userId={user?.userId}
                    initials={initials}
                    className="h-8 w-8 shrink-0 rounded-lg"
                    fallbackClassName="rounded-lg bg-felt font-display text-xs text-background"
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      @{user?.username ?? "-"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-72 p-0">
                {/* 身份卡头：大头像 + 名称 + 管理员徽章 + 用户名 */}
                <div className="flex items-center gap-3 px-3 py-3">
                  <UserAvatar
                    userId={user?.userId}
                    initials={initials}
                    className="h-11 w-11"
                    fallbackClassName="bg-felt font-display text-base text-background"
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-sm font-semibold leading-none">
                        {name}
                      </span>
                      {user?.admin && (
                        <Badge className="h-4 px-1 text-[10px]">管理员</Badge>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      @{user?.username ?? "-"}
                    </span>
                  </div>
                </div>

                {/* 信息行：邮箱（icon + 内容，紧凑无小标题） */}
                {user?.mail ? (
                  <>
                    <DropdownMenuSeparator className="m-0" />
                    <div className="flex flex-col gap-2 px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono">{user.mail}</span>
                      </div>
                    </div>
                  </>
                ) : null}

                <DropdownMenuSeparator className="m-0" />
                <div className="p-1">
                  <DropdownMenuItem asChild>
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      返回前台
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault(); // 保持下拉打开，避免 AlertDialog 焦点冲突
                      setConfirmLogout(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 退出登录二次确认：防止向上展开误触直接退出 */}
            <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
                  <AlertDialogDescription>
                    退出后需要重新登录才能继续使用后台功能。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={logout}>
                    退出登录
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

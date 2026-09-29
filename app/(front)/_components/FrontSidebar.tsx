"use client";

import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Mail,
  Settings,
  Shield,
} from "lucide-react";
import { MenuIcon } from "@/components/menuIcons";
import { LogoMark } from "@/components/LogoMark";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useAuth } from "@/hooks/useAuth";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useUser } from "@/hooks/useUser";
import { MENU_TYPE } from "@/types";

// 前台侧栏（布局切换的 side 模式；结构移植自 ConsoleSidebar）：菜单由后端
// /menu/menuTree(menuType=-2) 驱动，首页常驻首位。可折叠图标栏 + 移动端 Sheet。
// Link 带 navTo hack（同 path 仅改 query 时手动 popstate，见 Header.tsx 同款注释）。
export function FrontSidebar() {
  const pathname = usePathname();
  const { authenticated, logout } = useAuth();
  const { user } = useUser();
  const { menu, loading } = useMenuTree(MENU_TYPE.FRONT);
  const { state, isMobile } = useSidebar();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // 用户菜单防误触：记录当前手势的 pointerdown 是否落在菜单内容内（见下）。
  const menuDownInsideRef = useRef(false);

  // 首页固定常驻首位（logo 也回首页）；接口若也返回 "/" 则去重。
  const menuItems = (menu ?? []).filter((m) => m.path !== "/");

  // active 判定：菜单项路径可能互为前缀（如 申请中心 /process/application 与
  // OA申请中心 /process/application/oa），裸 startsWith 会同时点亮两项。
  // 只有「最具体（最长）匹配」的项算 active；父组高亮看是否有后代命中。
  const leafPaths = menuItems.flatMap((m) =>
    m.children?.length ? m.children.map((c) => c.path) : [m.path],
  );
  const bestMatch = leafPaths
    .filter((p) => pathname === p || pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (path: string) => bestMatch === path;
  const groupActive = (paths: string[]) =>
    bestMatch !== undefined && paths.includes(bestMatch);

  // 静态导出下同 path 仅改 query 的软导航不会重建页面组件，详情态（?view=...）的 Inner
  // 不会自动回列表。同 path 时拦截：pushState 改 URL + 手动补发 popstate，让 Inner 的
  // popstate 监听响应并 parseView 重算。不同 path 走 Link 默认导航（不拦截）。
  function navTo(e: MouseEvent<HTMLAnchorElement>, path: string) {
    if (path !== pathname) return; // 跨页：交给 Link 正常导航
    if (window.location.search === "") return; // 无 query（已在列表态）：无需处理
    e.preventDefault();
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";

  return (
    <Sidebar collapsible="icon">
      {/* 上：logo（点回首页）*/}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <LogoMark />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span data-slot="logo-text" className="font-display truncate font-semibold">
                    Joker Box
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    an aggregation platform
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 中：菜单（首页常驻 + 后端菜单；父项用 Collapsible；当前路由所在组默认展开）*/}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="首页">
                  <Link href="/">
                    <MenuIcon name="Home" />
                    <span>首页</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {loading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : (
                menuItems.map((item) => {
                  const childPaths = item.children?.map((c) => c.path) ?? [];
                  const active =
                    childPaths.length > 0
                      ? groupActive(childPaths)
                      : isActive(item.path);

                  if (!item.children?.length) {
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          tooltip={item.name}
                        >
                          <Link href={item.path} onClick={(e) => navTo(e, item.path)}>
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
                            {item.children.map((child) => (
                              <DropdownMenuItem asChild key={child.path}>
                                <Link
                                  href={child.path}
                                  onClick={(e) => navTo(e, child.path)}
                                >
                                  {child.name}
                                </Link>
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
                              const childActive = isActive(child.path);
                              return (
                                <SidebarMenuSubItem key={child.path}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={childActive}
                                  >
                                    <Link
                                      href={child.path}
                                      onClick={(e) => navTo(e, child.path)}
                                    >
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

      {/* 下：未登录 -> 登录/注册；已登录 -> 用户菜单（向上展开）*/}
      <SidebarFooter>
        {authenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={name}
                    className="data-[state=open]:bg-sidebar-accent"
                    onPointerDownCapture={() => {
                      // 本次手势从触发器开始（不在菜单内容内）
                      menuDownInsideRef.current = false;
                    }}
                  >
                    <UserAvatar
                      userId={user?.userId}
                      initials={initials}
                      className="h-8 w-8 shrink-0 rounded-lg"
                      fallbackClassName="rounded-lg bg-brand-2 font-display text-xs text-background"
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
                {/* 防误触：同 ConsoleSidebar 用户菜单——拦掉内容内未先按下的第一次抬起，
                    避免向上展开时贴边菜单项（退出登录）被开菜单手势的抬起误触发。 */}
                <DropdownMenuContent
                  side="top"
                  align="end"
                  className="w-72 p-0"
                  onPointerDownCapture={() => {
                    menuDownInsideRef.current = true;
                  }}
                  onPointerUpCapture={(e) => {
                    if (!menuDownInsideRef.current) e.stopPropagation();
                  }}
                >
                  {/* 身份卡头：大头像 + 名称 + 管理员徽章 + 用户名 */}
                  <div className="flex items-center gap-3 px-3 py-3">
                    <UserAvatar
                      userId={user?.userId}
                      initials={initials}
                      className="h-11 w-11"
                      fallbackClassName="bg-brand-2 font-display text-base text-background"
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

                  {/* 信息行：角色 / 机构 / 邮箱（icon + 内容，紧凑无小标题；同前台 UserMenu） */}
                  {(user?.roles?.length || user?.orgs?.length || user?.mail) && (
                    <>
                      <DropdownMenuSeparator className="m-0" />
                      <div className="flex flex-col gap-2 px-3 py-2.5 text-xs">
                        {user?.roles?.length ? (
                          <div className="flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((r) => (
                                <Badge
                                  key={r.name}
                                  variant="outline"
                                  className="h-4 px-1 text-[10px] font-normal text-muted-foreground"
                                >
                                  {r.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {user?.orgs?.length ? (
                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {/* 机构可能多且名称长：Badge 换行全显（同角色行），
                                高度封顶可滚动；单个超长名 truncate + title 悬停见全名 */}
                            <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                              {user.orgs.map((o) => (
                                <Badge
                                  key={o.name}
                                  variant="outline"
                                  title={o.name}
                                  className="h-4 max-w-full px-1 text-[10px] font-normal text-muted-foreground"
                                >
                                  <span className="min-w-0 truncate">{o.name}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {user?.mail ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-mono">{user.mail}</span>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}

                  <DropdownMenuSeparator className="m-0" />
                  <div className="p-1">
                    {user?.admin ? (
                      <DropdownMenuItem asChild>
                        <Link href="/console">
                          <LayoutDashboard className="h-4 w-4" />
                          后台管理
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4" />
                        个人设置
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
                      退出后需要重新登录才能继续使用受限功能。
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
        ) : (
          <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:hidden">
            <Button asChild variant="default" size="sm">
              <Link href="/login">登录</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/register">注册</Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

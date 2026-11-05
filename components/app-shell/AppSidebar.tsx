"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { MenuIcon } from "@/components/menuIcons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useMenuTree } from "@/hooks/useMenuTree";
import { useNavTo } from "@/hooks/useNavTo";
import { findActiveLeaf, menuContains } from "@/lib/nav-match";
import { cn } from "@/lib/utils";
import type { MenuType } from "@/types";

// 应用侧栏（前台 side 模式 + 后台共用）：菜单由后端 menuTree 驱动，可折叠图标栏 + 移动端 Sheet。
// 一级带图标，二级不带；选中态统一走 lib/nav-match 的最长路径匹配。
export function AppSidebar({
  menuType,
  homeHref,
  subtitle,
  pinHome = false,
  footer,
}: {
  menuType: MenuType;
  /** Logo 指向 */
  homeHref: string;
  subtitle: string;
  /** 菜单首位常驻「首页」（前台用；接口若也返回 "/" 则去重） */
  pinHome?: boolean;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const navTo = useNavTo();
  const { menu, loading } = useMenuTree(menuType);
  const { state, isMobile, setOpenMobile } = useSidebar();
  // 分组展开状态：用户操作过的记在这里，没操作过的跟随「是否包含当前路由」，
  // 这样从全局搜索等入口跳转后，目标所在分组也会自动展开。
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const items = (menu ?? []).filter((m) => !pinHome || m.path !== "/");
  const activePath = findActiveLeaf(items, pathname);
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* 高度与主区顶栏（h-14）对齐，分隔线连成一条 */}
      <SidebarHeader className="h-14 justify-center border-b py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-10 text-foreground hover:bg-transparent">
              <Link href={homeHref} onClick={closeMobile}>
                <LogoMark />
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span data-slot="logo-text" className="font-brand truncate font-semibold">
                    Joker Box
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {pinHome && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="首页">
                    <Link href="/" onClick={closeMobile}>
                      <MenuIcon name="Home" />
                      <span>首页</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {loading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : (
                items.map((item) => {
                  const active = menuContains(item, activePath);

                  if (!item.children?.length) {
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                          <Link
                            href={item.path}
                            onClick={(e) => {
                              navTo(e, item.path);
                              closeMobile();
                            }}
                          >
                            <MenuIcon name={item.icon ?? ""} />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  // 折叠态：点开向右浮层，子项自动关闭并跳转
                  if (state === "collapsed" && !isMobile) {
                    return (
                      <SidebarMenuItem key={item.path}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton isActive={active}>
                              <MenuIcon name={item.icon ?? ""} />
                              <span>{item.name}</span>
                              <ChevronRight className="ml-auto group-data-[collapsible=icon]:hidden" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-52">
                            <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {item.children.map((child) => (
                              <DropdownMenuItem
                                asChild
                                key={child.path}
                                className={cn(
                                  menuContains(child, activePath) &&
                                    "bg-brand/12 font-medium focus:bg-brand/18",
                                )}
                              >
                                <Link href={child.path} onClick={(e) => navTo(e, child.path)}>
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
                      open={openGroups[item.path] ?? active}
                      onOpenChange={(open) =>
                        setOpenGroups((prev) => ({ ...prev, [item.path]: open }))
                      }
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.name} data-group-active={active}>
                            <MenuIcon name={item.icon ?? ""} />
                            <span>{item.name}</span>
                            <ChevronRight className="ml-auto text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.path}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={menuContains(child, activePath)}
                                >
                                  <Link
                                    href={child.path}
                                    onClick={(e) => {
                                      navTo(e, child.path);
                                      closeMobile();
                                    }}
                                  >
                                    <span>{child.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
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

      <SidebarFooter className="border-t">{footer}</SidebarFooter>
    </Sidebar>
  );
}

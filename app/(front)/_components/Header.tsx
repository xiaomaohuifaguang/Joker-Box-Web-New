"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Palette } from "lucide-react";
import { AppearanceMenu } from "@/components/AppearanceMenu";
import { AppearancePanel } from "@/components/AppearancePanel";
import { CommandMenu } from "@/components/CommandMenu";
import { Container } from "@/components/Container";
import { LogoMark } from "@/components/LogoMark";
import { MenuIcon } from "@/components/menuIcons";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMobilePanel } from "@/components/user-menu/UserMobilePanel";
import { useAuth } from "@/hooks/useAuth";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useNavTo } from "@/hooks/useNavTo";
import { findActiveLeaf, menuContains } from "@/lib/nav-match";
import { cn } from "@/lib/utils";
import { MENU_TYPE } from "@/types";
import { UserMenu } from "./UserMenu";

// 顶栏导航项（链接和带子菜单的触发器共用）：悬停有底色，选中与侧栏同一套品牌色淡底。
const navItemClass =
  "inline-flex h-9 items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
const navItemActiveClass = "bg-brand/15 font-medium text-foreground hover:bg-brand/20";

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(navItemClass, active && navItemActiveClass)}
    >
      {label}
    </Link>
  );
}

// NavigationMenu trigger：覆盖默认样式，与顶栏链接一致；展开时保持悬停底色。
const navTriggerClass =
  "w-auto gap-1 bg-transparent font-normal focus:bg-accent focus:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent";

// 移动菜单一行的样式。
function mobileRowClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
    active ? "bg-brand/15 font-medium text-foreground hover:bg-brand/20" : "text-muted-foreground",
  );
}

// 前台头部：左 logo / 中 导航（桌面）/ 右 搜索 + 外观 + 用户入口（桌面）或 搜索 + 汉堡（移动）。
// 导航由后端 /menu/menuTree(menuType=-2) 驱动；顶栏纯文字，图标只在移动菜单一级显示。
export function Header() {
  const { authenticated } = useAuth();
  const pathname = usePathname();
  const navTo = useNavTo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const { menu } = useMenuTree(MENU_TYPE.FRONT);
  // 首页固定常驻首位（logo 也回首页）；接口若也返回 "/" 则去重。
  const menuItems = (menu ?? []).filter((m) => m.path !== "/");
  const activePath = findActiveLeaf(menuItems, pathname);

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <Container className="flex h-16 items-center gap-4">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span data-slot="logo-text" className="font-brand text-lg font-semibold tracking-tight">
              Joker Box
            </span>
          </Link>
        </div>

        {/* 中：导航（桌面；父菜单用 NavigationMenu，键盘可达）*/}
        <NavigationMenu viewport={false} className="hidden flex-none md:flex">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <NavLink href="/" label="首页" active={pathname === "/"} />
            </NavigationMenuItem>
            {menuItems.map((item) => {
              const active = menuContains(item, activePath);
              return item.children?.length ? (
                <NavigationMenuItem key={item.path}>
                  <NavigationMenuTrigger
                    className={cn(navItemClass, navTriggerClass, active && navItemActiveClass)}
                  >
                    {item.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    {/* 子菜单：名称上 / 描述下（有值才渲染） */}
                    <ul className="flex w-60 flex-col gap-0.5 p-1.5">
                      {item.children.map((c) => {
                        const childActive = menuContains(c, activePath);
                        return (
                          <li key={c.path}>
                            <NavigationMenuLink
                              asChild
                              active={childActive}
                              className={cn(
                                "flex flex-col items-start gap-0.5 rounded-md px-3 py-2 transition-colors hover:bg-accent focus:bg-accent",
                                childActive &&
                                  "bg-brand/15 hover:bg-brand/20 focus:bg-brand/20 data-[active=true]:bg-brand/15",
                              )}
                            >
                              <Link href={c.path} onClick={(e) => navTo(e, c.path)}>
                                <span className={cn("text-sm", childActive && "font-medium")}>
                                  {c.name}
                                </span>
                                {c.description ? (
                                  <span className="text-xs text-muted-foreground">
                                    {c.description}
                                  </span>
                                ) : null}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.path}>
                  <NavLink
                    href={item.path}
                    label={item.name}
                    active={active}
                    onClick={(e) => navTo(e, item.path)}
                  />
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex flex-1 items-center justify-end gap-2">
          <CommandMenu />
          <div className="hidden items-center gap-2 md:flex">
            <AppearanceMenu showLayout />
            {authenticated ? (
              <UserMenu />
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/register">注册</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/login">登录</Link>
                </Button>
              </>
            )}
          </div>

          {/* 移动端：汉堡打开 Sheet 菜单 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground md:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 gap-0 p-0" aria-describedby={undefined}>
              <SheetHeader className="border-b">
                <SheetTitle className="font-brand text-lg font-semibold">Joker Box</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                <Link href="/" onClick={closeMobile} className={mobileRowClass(pathname === "/")}>
                  <MenuIcon name="Home" className="h-4 w-4" />
                  首页
                </Link>
                {menuItems.map((item) => {
                  const active = menuContains(item, activePath);
                  return item.children?.length ? (
                    <Collapsible key={item.path} defaultOpen={active} className="group/mobile">
                      <CollapsibleTrigger
                        className={cn(mobileRowClass(false), active && "font-medium text-foreground")}
                      >
                        {item.icon && <MenuIcon name={item.icon} className="h-4 w-4" />}
                        {item.name}
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/mobile:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-5 mt-1 flex flex-col gap-1 border-l pl-2">
                          {item.children.map((c) => (
                            <Link
                              key={c.path}
                              href={c.path}
                              onClick={(e) => {
                                closeMobile();
                                navTo(e, c.path);
                              }}
                              className={cn(
                                mobileRowClass(menuContains(c, activePath)),
                                "flex-col items-start gap-0.5",
                              )}
                            >
                              <span>{c.name}</span>
                              {c.description ? (
                                <span className="text-xs font-normal text-muted-foreground">
                                  {c.description}
                                </span>
                              ) : null}
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={(e) => {
                        closeMobile();
                        navTo(e, item.path);
                      }}
                      className={mobileRowClass(active)}
                    >
                      {item.icon && <MenuIcon name={item.icon} className="h-4 w-4" />}
                      {item.name}
                    </Link>
                  );
                })}

                {/* 外观内联在滚动区，避免在 Sheet 里再开浮层 */}
                <Collapsible className="group/mobile mt-2 border-t pt-2">
                  <CollapsibleTrigger className={mobileRowClass(false)}>
                    <Palette className="h-4 w-4" />
                    外观设置
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/mobile:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 py-2">
                    <AppearancePanel showLayout />
                  </CollapsibleContent>
                </Collapsible>
              </nav>
              <div className="border-t">
                {authenticated ? (
                  <UserMobilePanel onNavigate={closeMobile} />
                ) : (
                  <div className="flex gap-2 p-3">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/register" onClick={closeMobile}>
                        注册
                      </Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href="/login" onClick={closeMobile}>
                        登录
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}

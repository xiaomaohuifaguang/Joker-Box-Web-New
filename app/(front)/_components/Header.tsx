"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useTheme } from "@/hooks/useTheme";
import { useUser } from "@/hooks/useUser";
import { UserMenu } from "./UserMenu";
import { ThemeSelect } from "@/components/ThemeSelect";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MENU_TYPE } from "@/types";

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative text-sm transition-colors hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1.5 left-0 h-px w-full bg-brand" />
      )}
    </Link>
  );
}

// NavigationMenu trigger / 子链接样式：覆盖默认填充胶囊，匹配极简文字风。
const navTriggerClass =
  "h-auto w-auto rounded-none bg-transparent px-0 py-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground focus:bg-transparent focus:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground";
const subLinkClass =
  "flex-row gap-0 rounded-md px-3 py-2 hover:bg-background hover:text-foreground data-[active=true]:bg-transparent data-[active=true]:text-foreground";

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// 前台头部：左 logo / 中 导航（桌面）/ 右 预设+明暗+登录（桌面）或汉堡 Sheet（移动）。
// 导航由后端 /menu/menuTree(menuType=-2) 驱动，useMenuTree 按 whiteList + authPaths 过滤。
export function Header() {
  const { authenticated, logout } = useAuth();
  const { scheme, toggleScheme } = useTheme();
  const { user } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { menu } = useMenuTree(MENU_TYPE.FRONT);
  // 首页固定常驻首位（logo 也回首页）；接口若也返回 "/" 则去重。
  const menuItems = (menu ?? []).filter((m) => m.path !== "/");

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-16 items-center px-6">
        {/* 左：logo--扑克牌角标（J + 红黑桃）+ 字标 */}
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="flex h-7 w-6 flex-col items-center justify-center rounded-[3px] border leading-none"
              aria-hidden="true"
            >
              <span className="font-display text-[10px] font-bold">J</span>
              <span className="text-[11px] leading-none text-brand">♠</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Joker Box
            </span>
          </Link>
        </div>

        {/* 中：导航（桌面；当前页发丝下划线；父菜单用 NavigationMenu，键盘可达）*/}
        <NavigationMenu viewport={false} className="hidden flex-none md:flex">
          <NavigationMenuList className="gap-6">
            <NavigationMenuItem>
              <NavLink href="/" label="首页" active={pathname === "/"} />
            </NavigationMenuItem>
            {menuItems.map((item) =>
              item.children?.length ? (
                <NavigationMenuItem key={item.path}>
                  <NavigationMenuTrigger className={navTriggerClass}>
                    {item.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="flex w-40 flex-col">
                      {item.children.map((c) => (
                        <li key={c.path}>
                          <NavigationMenuLink
                            asChild
                            active={pathname === c.path}
                            className={subLinkClass}
                          >
                            <Link href={c.path}>{c.name}</Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.path}>
                  <NavLink
                    href={item.path}
                    label={item.name}
                    active={pathname === item.path}
                  />
                </NavigationMenuItem>
              ),
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* 右：桌面（预设 + 明暗 + 登录/用户菜单）/ 移动（汉堡 -> Sheet）*/}
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center gap-3 md:flex">
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
                  {scheme === "dark" ? <SunIcon /> : <MoonIcon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {scheme === "dark" ? "切换浅色模式" : "切换深色模式"}
              </TooltipContent>
            </Tooltip>
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
            <SheetContent
              side="right"
              className="w-72 gap-0 p-0"
              aria-describedby={undefined}
            >
              <SheetHeader className="border-b">
                <SheetTitle className="font-display text-lg font-semibold">
                  Joker Box
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground ${
                    pathname === "/" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  首页
                </Link>
                {menuItems.map((item) =>
                  item.children?.length ? (
                    <Collapsible key={item.path}>
                      <CollapsibleTrigger className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                        {item.name}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-3 flex flex-col border-l pl-2">
                          {item.children.map((c) => (
                            <Link
                              key={c.path}
                              href={c.path}
                              onClick={() => setMobileOpen(false)}
                              className={`rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-background hover:text-foreground ${
                                pathname === c.path
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground ${
                        pathname === item.path
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ),
                )}
              </div>
              <div className="flex flex-col gap-3 border-t p-4">
                <div className="flex items-center gap-2">
                  <ThemeSelect />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleScheme}
                    aria-label="切换深色模式"
                    className="text-muted-foreground"
                  >
                    {scheme === "dark" ? <SunIcon /> : <MoonIcon />}
                  </Button>
                </div>
                {authenticated ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-felt font-display text-xs text-background">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      aria-label="退出登录"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/register" onClick={() => setMobileOpen(false)}>
                        注册
                      </Link>
                    </Button>
                    <Button asChild variant="default" className="flex-1">
                      <Link href="/login" onClick={() => setMobileOpen(false)}>
                        登录
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";

type MenuChild = { href: string; label: string };
type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: MenuChild[];
};

// 后台菜单：/console 为扁平项，其余支持子菜单（占位路由，暂无页面）。
const menu: MenuItem[] = [
  { href: "/console", label: "仪表盘", icon: LayoutDashboard },
  {
    href: "/console/users",
    label: "用户管理",
    icon: Users,
    children: [
      { href: "/console/users/list", label: "用户列表" },
      { href: "/console/users/new", label: "新增用户" },
    ],
  },
  {
    href: "/console/roles",
    label: "角色管理",
    icon: Shield,
    children: [
      { href: "/console/roles/list", label: "角色列表" },
      { href: "/console/roles/perm", label: "权限配置" },
    ],
  },
  {
    href: "/console/orgs",
    label: "机构管理",
    icon: Building2,
    children: [
      { href: "/console/orgs/list", label: "机构列表" },
      { href: "/console/orgs/members", label: "机构成员" },
    ],
  },
  {
    href: "/console/settings",
    label: "系统设置",
    icon: Settings,
    children: [
      { href: "/console/settings/basic", label: "基本设置" },
      { href: "/console/settings/security", label: "安全设置" },
    ],
  },
];

// 后台侧边栏：上 logo(+收起钮) / 中 菜单(可收起、支持子菜单) / 下 用户+退出。
export function ConsoleSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser();

  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    // 默认展开当前路由所属的父菜单
    const initial = new Set<string>();
    for (const item of menu) {
      if (item.children && pathname.startsWith(item.href)) initial.add(item.href);
    }
    return initial;
  });

  const initials = (user?.nickname || user?.username || "?")
    .slice(0, 2)
    .toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";

  function toggleMenu(href: string) {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  // 收起态点父菜单：展开侧栏 + 打开该子菜单
  function handleParentClickCollapsed(href: string) {
    setCollapsed(false);
    setOpenMenus((prev) => new Set(prev).add(href));
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* 上：logo + 收起钮 */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b",
          collapsed
            ? "flex-col justify-center gap-1"
            : "gap-2 px-4",
        )}
      >
        <span
          className="flex h-7 w-6 shrink-0 flex-col items-center justify-center rounded-[3px] border leading-none"
          aria-hidden="true"
        >
          <span className="font-display text-[10px] font-bold">J</span>
          <span className="text-[11px] leading-none text-brand">♠</span>
        </span>
        {!collapsed && (
          <span className="flex-1 font-display text-lg font-semibold tracking-tight">
            Joker Box
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground",
            !collapsed && "ml-auto",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 中：菜单 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {menu.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-background font-medium text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          }

          const open = openMenus.has(item.href);
          const active = pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              <button
                type="button"
                onClick={() =>
                  collapsed
                    ? handleParentClickCollapsed(item.href)
                    : toggleMenu(item.href)
                }
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                )}
              </button>
              {!collapsed && open && (
                <div className="mb-0.5 ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                  {item.children.map((child) => {
                    const childActive =
                      pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-sm transition-colors",
                          childActive
                            ? "bg-background font-medium text-foreground"
                            : "text-muted-foreground hover:bg-background hover:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 下：用户信息 + 退出 */}
      <div className="shrink-0 border-t p-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-felt font-display text-xs text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && <span className="flex-1 truncate text-sm">{name}</span>}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="退出登录"
            className="h-8 w-8 shrink-0 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useMounted } from "@/hooks/useMounted";
import { useMenuTree } from "@/hooks/useMenuTree";
import { MENU_TYPE } from "@/types";
import type { Menu } from "@/types";
import { NotFoundPage } from "@/components/NotFoundPage";

// 后台菜单树（任意层级）中是否含某 path。
function hasMenuPath(menus: Menu[], pathname: string): boolean {
  for (const m of menus) {
    if (m.path === pathname) return true;
    if (m.children?.length && hasMenuPath(m.children, pathname)) return true;
  }
  return false;
}

// 后台守卫：登录 + admin + 当前路由在后台菜单树内（/console 仪表盘除外）。
// - 未登录 / 非 admin -> 404（隐藏后台存在）
// - admin 但路由不在后台菜单树（无权限，URL 直进也挡）-> 404
// - 菜单树加载中 -> 暂不渲染（避免误判）
// 菜单树由后端按 token 过滤，是后台路由权限的真实来源；客户端守卫仅 UX，真实鉴权在后端。
export function RequireAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();
  const { menu: consoleMenu, loading: menuLoading } = useMenuTree(
    MENU_TYPE.CONSOLE,
  );

  if (!mounted) return null;
  if (!authenticated) {
    return <NotFoundPage />;
  }
  if (!user) return null;
  if (!user.admin) return <NotFoundPage />;
  // /console 仪表盘：admin 即可
  if (pathname === "/console") return <>{children}</>;
  // 其他后台路由：必须在后台菜单树内（菜单树加载中暂不判定）
  if (menuLoading || !consoleMenu) return null;
  if (!hasMenuPath(consoleMenu, pathname)) return <NotFoundPage />;
  return <>{children}</>;
}

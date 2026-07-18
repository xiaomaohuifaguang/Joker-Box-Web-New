"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useMenuTree } from "@/hooks/useMenuTree";
import { MENU_TYPE, type Menu } from "@/types";
import { cn } from "@/lib/utils";

// 查找从顶级菜单到当前路由的路径链（含两端）。
// 先精确匹配（叶子或父级自身有页），再递归子树（父级作为祖先）。
// 不用前缀贪心，避免 /console 之类的叶子误匹配所有 /console/*。
function findMenuPath(items: Menu[], pathname: string): Menu[] {
  for (const item of items) {
    if (pathname === item.path) return [item];
    if (item.children?.length) {
      const sub = findMenuPath(item.children, pathname);
      if (sub.length) return [item, ...sub];
    }
  }
  return [];
}

// 后台顶栏面包屑：根据当前路由 + console 菜单树，显示"你在哪"。
// 纯文本（父级无真实路由，不做链接，避免 404）；末段（当前页）加粗。
// 导航走侧栏，面包屑只做定位指示。菜单未就绪或路由不在菜单里时不渲染。
export function ConsoleBreadcrumb() {
  const pathname = usePathname();
  const { menu } = useMenuTree(MENU_TYPE.CONSOLE);
  const path = findMenuPath(menu ?? [], pathname);

  if (path.length === 0) return null;

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      {path.map((item, i) => {
        const last = i === path.length - 1;
        return (
          <Fragment key={item.path}>
            {i > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "truncate",
                last
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.name}
            </span>
          </Fragment>
        );
      })}
    </nav>
  );
}

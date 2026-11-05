"use client";

import Link from "next/link";
import { MenuIcon } from "@/components/menuIcons";
import { useNavTo } from "@/hooks/useNavTo";
import type { MenuLeaf } from "@/lib/nav-match";

// 功能入口格（工作台、后台仪表盘共用）：菜单没配图标时用名称首字占位。
export function NavTile({ leaf }: { leaf: MenuLeaf }) {
  const navTo = useNavTo();
  const { menu, parents } = leaf;
  const subtitle = menu.description || parents.join(" / ");
  return (
    <Link
      href={menu.path}
      onClick={(e) => navTo(e, menu.path)}
      className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/12 text-sm font-semibold text-brand">
        {menu.icon ? <MenuIcon name={menu.icon} className="h-5 w-5" /> : menu.name.slice(0, 1)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{menu.name}</span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>
    </Link>
  );
}

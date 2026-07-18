"use client";

import { useEffect, useMemo, useState } from "react";
import { getMenuTree } from "@/lib/api/menu";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";
import { useUser } from "@/hooks/useUser";
import type { Menu, MenuType } from "@/types";

// 单个菜单项是否可见：白名单(whiteList==="1")无需鉴权；否则需 path 在 authPaths 内。
function isVisible(menu: Menu, authPaths?: string[]): boolean {
  if (menu.whiteList === "1") return true;
  return !!authPaths?.includes(menu.path);
}

// 递归过滤菜单树：叶子按可见性过滤；父菜单任一子可见则保留（子各自过滤）。
function filterMenuTree(menus: Menu[], authPaths?: string[]): Menu[] {
  return menus.flatMap((m) => {
    if (m.children && m.children.length) {
      const kids = filterMenuTree(m.children, authPaths);
      return kids.length ? [{ ...m, children: kids }] : [];
    }
    return isVisible(m, authPaths) ? [m] : [];
  });
}

// 模块级缓存：按 menuType + 登录态 + userId 缓存菜单树。
// 多个 Header 实例（前台布局 / 404 / 403 测试页等各自带的 Header）共享，避免重复请求。
// 登录/登出/切换用户 -> key 变 -> 自然失效重拉（登录后带 token 拿完整树）。
const cache = new Map<string, Menu[]>();
const pending = new Map<string, Promise<Menu[]>>();

function loadMenuTree(key: string, menuType: MenuType): Promise<Menu[]> {
  const existing = pending.get(key);
  if (existing) return existing; // 并发去重：多个实例同时挂载只发一次
  const p = getMenuTree(menuType)
    .then((data) => {
      const tree = data ?? [];
      cache.set(key, tree);
      pending.delete(key);
      return tree;
    })
    .catch(() => {
      cache.set(key, []); // 失败回落空树（导航缺失，不阻断页面）
      pending.delete(key);
      return [];
    });
  pending.set(key, p);
  return p;
}

// 拉取菜单树并按权限过滤。
// - menuType 决定后台(-1)/前台(-2)。
// - 挂载后按 key 查缓存；命中则直接用（不重复请求），未命中才拉。
// - 过滤随 user.authPaths 响应更新（无需重拉）。
export function useMenuTree(menuType: MenuType) {
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();
  const authed = !!authenticated;
  const userId = user?.userId;
  const key = `${menuType}:${authed}:${userId ?? "anon"}`;

  const [tree, setTree] = useState<Menu[] | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    if (!mounted) return;
    const cached = cache.get(key);
    if (cached) {
      setTree(cached);
      return;
    }
    let active = true;
    loadMenuTree(key, menuType).then((data) => {
      if (active) setTree(data);
    });
    return () => {
      active = false;
    };
  }, [mounted, key, menuType]);

  const menu = useMemo(
    () => (tree ? filterMenuTree(tree, user?.authPaths) : null),
    [tree, user?.authPaths],
  );

  return { menu, loading: tree === null };
}

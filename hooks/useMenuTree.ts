"use client";

import { useEffect, useState } from "react";
import { getMenuTree } from "@/lib/api/menu";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";
import { useUser } from "@/hooks/useUser";
import type { Menu, MenuType } from "@/types";

// 模块级缓存：按 menuType + authed + userId 缓存菜单树，多个 Header 实例共享。
// 后端已按 token 过滤菜单树（返回用户可见的项），客户端直接渲染、不再二次过滤 authPaths。
// 页面级用 <RequirePermission> 兜底（直接输入 URL 无权限 -> 404）。
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

// 拉取菜单树（后端已过滤）。menuType 决定后台(-1)/前台(-2)。
// 挂载后按 key 查缓存；命中则直接用（不重复请求），未命中才拉。
// 登录/登出/换用户 -> key 变 -> 自然失效重拉。
export function useMenuTree(menuType: MenuType) {
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();
  const authed = !!authenticated;
  const userId = user?.userId;
  const key = `${menuType}:${authed}:${userId ?? "anon"}`;

  const [tree, setTree] = useState<Menu[] | null>(() => cache.get(key) ?? null);

  // key 变化时若命中缓存则立即回填（render 期内条件 setState；effect 内只在异步回调 setState）。
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    const cached = cache.get(key);
    if (cached) setTree(cached);
  }

  useEffect(() => {
    if (!mounted) return;
    if (cache.get(key)) return; // 命中缓存：render 期已回填，免请求
    let active = true;
    loadMenuTree(key, menuType).then((data) => {
      if (active) setTree(data);
    });
    return () => {
      active = false;
    };
  }, [mounted, key, menuType]);

  return { menu: tree, loading: tree === null };
}

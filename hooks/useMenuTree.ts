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
const pending = new Map<string, Promise<Menu[] | null>>();

function loadMenuTree(key: string, menuType: MenuType): Promise<Menu[] | null> {
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
      pending.delete(key);
      // 失败不缓存空树（旧逻辑把 [] 永久缓存导致菜单长期为空）；保持 null 让下次挂载重试。
      return null;
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
    setTree(cache.get(key) ?? null);
  }

  useEffect(() => {
    if (!mounted) return;
    if (cache.get(key)) return; // 命中缓存：render 期已回填，免请求
    // 已登录但 userId 未就绪（key 仍是 anon）：等 user 加载出真实 key 再拉，
    // 避免用 anon key 提前发请求并把结果缓存到错误的 key 下（刚登录进后台菜单为空的根因）。
    if (authed && !userId) return;
    let active = true;
    loadMenuTree(key, menuType).then((data) => {
      if (active) setTree(data);
    });
    return () => {
      active = false;
    };
  }, [mounted, key, menuType, authed, userId]);

  return { menu: tree, loading: tree === null };
}

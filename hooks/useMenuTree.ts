"use client";

import { useEffect, useState } from "react";
import { getMenuTree } from "@/lib/api/menu";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";
import type { Menu, MenuType } from "@/types";

// 模块级缓存：按 menuType + token 缓存菜单树，多个 Header 实例共享。
// 后端按 token 过滤菜单树，所以缓存身份就是 token 本身：
// 过期 token 的响应只会落到过期 token 自己的 key 下，重新登录换新 token -> key 变 ->
// 必重新拉取，旧 key 的污染数据永不命中（旧实现用 authed+userId 做 key，过期 token
// 拿到的匿名菜单会缓存进"已登录"key，登录软导航后命中 -> 菜单为空）。
// 失败不缓存空树（旧逻辑把 [] 永久缓存导致菜单长期为空）；保持 null 让下次挂载重试。
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
      return null;
    });
  pending.set(key, p);
  return p;
}

// 拉取菜单树（后端已过滤）。menuType 决定后台(-1)/前台(-2)。
// 挂载后按 key 查缓存；命中则直接用（不重复请求），未命中才拉。
// 登录/登出/换用户 -> token 变 -> key 变 -> 自然失效重拉。
// 不等 userInfo：token 即可发请求，userInfo 失败不会卡住菜单。
export function useMenuTree(menuType: MenuType) {
  const mounted = useMounted();
  const { authenticated } = useAuth();
  // token 是 client-only：水合首帧（mounted=false / authenticated 还是服务端快照 false）
  // 按 anon 算 key，避免水合不一致；挂载后 authenticated 翻转会触发重渲染拿到真实 token。
  const token = mounted && authenticated ? getToken() : null;
  const key = `${menuType}:${token ?? "anon"}`;

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

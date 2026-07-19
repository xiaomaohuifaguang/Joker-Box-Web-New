"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { clearUser, fetchUserInfo } from "@/lib/user";

// 根据登录态自动拉取/清理用户信息：
// - 登录后（有 token）-> 每次挂载（刷新）都重新拉取 /auth/userInfo（获取最新权限/资料）。
//   本地缓存先显示，拉取完成后更新。失败静默（网络错误用缓存；401 由 handleUnauthorized 处理）。
// - 登出（无 token）但仍有缓存 -> 清理。
// 用 useRef 防止 setUser 触发重 fetch（同一次挂载只拉一次）。
// 放在根布局整站常驻；返回 null 不渲染 UI。
export function UserBootstrap() {
  const { authenticated } = useAuth();
  const { user } = useUser();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authenticated) {
      if (user) clearUser();
      fetchedRef.current = false;
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchUserInfo().catch(() => {});
  }, [authenticated, user]);

  return null;
}

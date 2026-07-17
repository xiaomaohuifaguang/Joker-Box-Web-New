"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { clearUser, fetchUserInfo } from "@/lib/user";

// 根据登录态自动拉取/清理用户信息：
// - 登录后（有 token）但本地无缓存 -> 拉取 /auth/userInfo
// - 登出（无 token）但仍有缓存 -> 清理
// 放在根布局整站常驻；返回 null 不渲染 UI。
export function UserBootstrap() {
  const { authenticated } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (authenticated && !user) {
      // 拉取失败（如 token 失效）静默；后续可在 api 层统一处理 401
      fetchUserInfo().catch(() => {});
    }
    if (!authenticated && user) {
      clearUser();
    }
  }, [authenticated, user]);

  return null;
}

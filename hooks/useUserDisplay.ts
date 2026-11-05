"use client";

import { useUser } from "@/hooks/useUser";

// 用户展示字段：名称 + 头像取字（用户菜单各入口共用）。
export function useUserDisplay() {
  const { user } = useUser();
  const initials = (user?.nickname || user?.username || "?").slice(0, 2).toUpperCase();
  const name = user?.nickname ?? user?.username ?? "用户";
  return { user, name, initials };
}

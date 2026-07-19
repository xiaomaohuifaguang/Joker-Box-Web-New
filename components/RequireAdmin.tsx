"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useMounted } from "@/hooks/useMounted";
import { NotFoundPage } from "@/components/NotFoundPage";

// 需要登录 + admin=true 才可访问：
// - 首帧（mounted=false）不判定，渲染 null，避免基于未就绪的 auth 误判
// - 未登录 -> 渲染 404（隐藏后台存在）
// - 已登录但用户信息未就绪 -> 暂不渲染（避免误判）
// - 已登录但非 admin -> 渲染 404（隐藏后台存在）
// - 否则 -> 渲染 children
export function RequireAdmin({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();

  if (!mounted) return null;
  if (!authenticated) {
    return <NotFoundPage />;
  }
  if (!user) return null;
  if (!user.admin) return <NotFoundPage />;
  return <>{children}</>;
}

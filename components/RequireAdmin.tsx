"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useMounted } from "@/hooks/useMounted";
import { NotFoundPage } from "@/components/NotFoundPage";

// 需要登录 + admin=true 才可访问：
// - 首帧（mounted=false）不判定，渲染 null，避免基于未就绪的 auth 误跳
// - 已登录但用户信息未就绪 -> 暂不渲染（避免误判）
// - 已登录但非 admin -> 渲染 404（隐藏后台存在）
// - 未登录 -> 跳首页 /（登录走首页按钮）
// - 否则 -> 渲染 children
// 退出登录时：清 token -> 登录态变 false -> 这里跳 /（回前台首页）。
export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!mounted) return;
    if (!authenticated) {
      router.replace("/");
    }
  }, [mounted, authenticated, router]);

  if (!mounted) return null;
  if (!authenticated) return null;
  if (!user) return null;
  if (!user.admin) return <NotFoundPage />;
  return <>{children}</>;
}

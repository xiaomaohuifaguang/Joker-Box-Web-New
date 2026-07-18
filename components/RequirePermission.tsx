"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useMounted } from "@/hooks/useMounted";
import { ErrorState } from "@/components/ErrorState";
import { FORBIDDEN_PROPS } from "@/lib/error-pages";

// 需要登录 + 当前路由在 user.authPaths 内才可访问：
// - 首帧（mounted=false）不判定，渲染 null，避免基于未就绪的 auth 误跳
// - 已登录但用户信息未就绪 -> 暂不渲染（避免误判 403）
// - 已登录但 authPaths 不含当前路由 -> 渲染 403
// - 未登录 -> 跳首页 /（登录走首页按钮，不强制跳 /login）
// - 否则 -> 渲染 children
export function RequirePermission({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
  if (!user.authPaths.includes(pathname)) {
    return <ErrorState {...FORBIDDEN_PROPS} />;
  }
  return <>{children}</>;
}

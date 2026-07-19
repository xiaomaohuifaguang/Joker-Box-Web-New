"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useMounted } from "@/hooks/useMounted";
import { ErrorState } from "@/components/ErrorState";

// 需要权限的路由守卫：当前路由不在 user.authPaths 内 -> 渲染 404。
// 未登录或已登录但无权限，统一显示 404（用户不该知道有这个页面）。
// 静态导出下这是客户端 UX 层守卫；真正鉴权在后端。
// useMounted 跳过首帧（token 是 client-only），避免已登录刷新时闪 404。
export function RequirePermission({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const { user } = useUser();

  if (!mounted) return null;
  // 未登录 -> 404（不跳 /login，隐藏页面存在）
  if (!authenticated) {
    return (
      <ErrorState
        code="404"
        title="找不到页面"
        message="这个地址不在牌盒里。回首页看看吧。"
      />
    );
  }
  // 已登录但用户信息未就绪 -> 暂不渲染（避免误判）
  if (!user) return null;
  // 已登录但 authPaths 不含当前路由 -> 404（不显示 403，隐藏页面存在）
  if (!user.authPaths.includes(pathname)) {
    return (
      <ErrorState
        code="404"
        title="找不到页面"
        message="这个地址不在牌盒里。回首页看看吧。"
      />
    );
  }
  return <>{children}</>;
}

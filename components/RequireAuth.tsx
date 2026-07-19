"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { isLoggedIn, onAuthChange } from "@/lib/auth";
import { useMounted } from "@/hooks/useMounted";
import { ErrorState } from "@/components/ErrorState";

// 包裹需要登录才能访问的内容：未登录 -> 渲染 404（隐藏页面存在）。
// 静态导出下这是客户端 UX 层守卫；真正鉴权在后端。
// useMounted 跳过首帧（token 是 client-only），避免已登录刷新时闪 404。
export function RequireAuth({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const authenticated = useSyncExternalStore(
    onAuthChange,
    () => isLoggedIn(),
    () => false,
  );

  if (!mounted) return null;
  if (!authenticated) {
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

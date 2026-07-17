"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn, onAuthChange } from "@/lib/auth";

// 包裹需要登录才能访问的内容：未登录跳 /login?from=当前路径。
// 静态导出下这是客户端 UX 层守卫；真正鉴权在后端。
// 登录态用 useSyncExternalStore 订阅，effect 只负责跳转副作用。
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useSyncExternalStore(
    onAuthChange,
    () => isLoggedIn(),
    () => false,
  );

  useEffect(() => {
    if (!authenticated) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [authenticated, router, pathname]);

  if (!authenticated) return null;

  return <>{children}</>;
}

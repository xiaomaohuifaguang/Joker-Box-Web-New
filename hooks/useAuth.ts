"use client";

import { useSyncExternalStore } from "react";
import { clearToken, isLoggedIn, onAuthChange } from "@/lib/auth";

// 响应式登录态，供前台公开页显示登录/登出按钮。
// 用 useSyncExternalStore 订阅 lib/auth 的登录态变化（跨标签页 + 同标签页）。
export function useAuth() {
  const authenticated = useSyncExternalStore(
    onAuthChange,
    () => isLoggedIn(),
    () => false,
  );

  return {
    authenticated,
    logout() {
      clearToken();
    },
  };
}

"use client";

import { useSyncExternalStore } from "react";
import { getUser, onUserChange } from "@/lib/user";

// 响应式当前用户信息，供组件读取（如 Header 昵称、后台 admin 判断）。
export function useUser() {
  const user = useSyncExternalStore(onUserChange, getUser, () => null);
  return { user };
}

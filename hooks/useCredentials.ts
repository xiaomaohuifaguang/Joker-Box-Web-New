"use client";

import { useSyncExternalStore } from "react";
import { getCredentials, onCredentialsChange } from "@/lib/credentials";

// 响应式读取记住的登录凭证（供登录页回填）。
export function useCredentials() {
  return useSyncExternalStore(onCredentialsChange, getCredentials, () => null);
}

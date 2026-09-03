"use client";

import { useEffect } from "react";
import { isTauri } from "@/lib/api/fetch";

// 桌面端（Tauri）生产构建：禁用 WebView2 原生右键菜单（检查/刷新/返回等）。
// - 仅 isTauri() 且生产构建时生效；web 端与 tauri dev 不受影响（dev 还要用右键调试）。
// - 放行可编辑元素（input/textarea/contenteditable），保留复制/粘贴等编辑菜单。
// - 应用自己的右键菜单（radix ContextMenu，如流程设计器右键删节点）不受影响：
//   preventDefault 只拦浏览器默认行为，不拦 JS 监听器。
export function DesktopGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !isTauri()) return;
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]',
        )
      )
        return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);
  return null;
}

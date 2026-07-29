"use client";

import { useSyncExternalStore } from "react";

// 监听 <html> 的 .dark 类变化（theme.ts 的 setScheme 是 classList.toggle，不发自定义事件给非 hook 调用方，
// 但会 emit；这里用 MutationObserver 直接盯 class，最稳——内联首屏脚本/手动 toggle 都能捕获）。
function subscribe(callback: () => void): () => void {
  const obs = new MutationObserver(callback);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

/** 当前是否暗色（跟随 <html>.dark 实时切换）。 */
export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

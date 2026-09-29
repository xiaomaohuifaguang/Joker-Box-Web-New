"use client";

import { useSyncExternalStore } from "react";
import {
  getFrontLayout,
  onFrontLayoutChange,
  toggleFrontLayout,
  type FrontLayout,
} from "@/lib/front-layout";

// 响应式前台布局模式（top 顶栏 / side 左侧栏）。SSR snapshot 固定 "top" 避免水合不一致；
// 首帧渲染门控在 app/(front)/layout.tsx 用 useMounted 做。
export function useFrontLayout() {
  const layout = useSyncExternalStore(
    onFrontLayoutChange,
    getFrontLayout,
    (): FrontLayout => "top",
  );
  return { layout, toggleLayout: toggleFrontLayout };
}

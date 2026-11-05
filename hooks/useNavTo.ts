"use client";

import { useCallback, type MouseEvent } from "react";
import { usePathname } from "next/navigation";

// 导航 Link 的 onClick：静态导出下同 path 仅改 query 的软导航不会重建页面组件，
// 详情态（?view=...）不会自动回列表。同 path 时拦截：pushState 改 URL + 手动补发 popstate，
// 让页面的 popstate 监听重算视图。跨页交给 Link 默认导航。
export function useNavTo() {
  const pathname = usePathname();
  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>, path: string) => {
      if (path !== pathname) return;
      if (window.location.search === "") return;
      e.preventDefault();
      window.history.pushState(null, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [pathname],
  );
}

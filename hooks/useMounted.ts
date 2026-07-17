"use client";

import { useSyncExternalStore } from "react";

// 是否已挂载（客户端水合后）。SSR/首帧返回 false，客户端水合后 true。
// 用于守卫等避免在首帧（token 尚未就绪、auth 还是 false）就误判跳转。
// 用 useSyncExternalStore 而非 useEffect+setState，避开 set-state-in-effect 规则。
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

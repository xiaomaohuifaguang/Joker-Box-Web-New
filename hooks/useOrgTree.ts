"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrgTree } from "@/lib/api/org";
import type { OrgTree } from "@/types";

// 拉取机构树。refresh() 供增删改后手动刷新。
export function useOrgTree() {
  const [tree, setTree] = useState<OrgTree[] | null>(null);
  const [loading, setLoading] = useState(true);

  // 核心拉取：setState 仅在 .then/.catch/.finally 回调内（非函数体同步执行）。
  const fetchTree = useCallback((alive: () => boolean) => {
    getOrgTree()
      .then((data) => {
        if (alive()) setTree(data ?? []);
      })
      .catch(() => {
        if (alive()) setTree([]);
      })
      .finally(() => {
        if (alive()) setLoading(false);
      });
  }, []);

  // 手动刷新（事件式调用）：sync setLoading 在非 effect 上下文允许。
  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetchTree(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchTree]);

  // 挂载拉取：loading 初值已为 true，effect 内只在异步回调 setState（避免 sync setState）。
  useEffect(() => {
    let cancelled = false;
    fetchTree(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchTree]);

  return { tree, loading, refresh: load };
}

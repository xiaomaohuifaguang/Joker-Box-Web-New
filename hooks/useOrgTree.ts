"use client";

import { useCallback, useEffect, useState } from "react";
import { getOrgTree } from "@/lib/api/org";
import type { OrgTree } from "@/types";

// 拉取机构树。refresh() 供增删改后手动刷新。
export function useOrgTree() {
  const [tree, setTree] = useState<OrgTree[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    getOrgTree()
      .then((data) => {
        if (!cancelled) setTree(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setTree([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { tree, loading, refresh: load };
}

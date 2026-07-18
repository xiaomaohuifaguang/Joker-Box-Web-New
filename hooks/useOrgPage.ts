"use client";

import { useEffect, useState } from "react";
import { queryOrgPage } from "@/lib/api/org";
import type { Org, Page } from "@/types";

// 分页查询机构列表。任一参数或 refreshKey 变化时重拉。
export function useOrgPage(params: {
  parentId: number;
  current: number;
  size: number;
  search: string;
  refreshKey: number;
}) {
  const { parentId, current, size, search, refreshKey } = params;
  const [page, setPage] = useState<Page<Org> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    queryOrgPage({ parentId, current, size, search: search || undefined })
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, current, size, search, refreshKey]);

  return { page, loading };
}

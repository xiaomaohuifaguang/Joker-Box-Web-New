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

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${parentId}|${current}|${size}|${search}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
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

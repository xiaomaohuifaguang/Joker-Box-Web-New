"use client";

import { useEffect, useState } from "react";
import { queryPostPage } from "@/lib/api/ganDaShi";
import type { GanDaShiPost, Page } from "@/types";

// 分页查询帖子列表。search 或 refreshKey 变化时重拉。
export function usePostPage(params: {
  search: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<GanDaShiPost> | null>(null);
  const [loading, setLoading] = useState(true);

  const depKey = `${search}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryPostPage({ search: search || undefined, current, size })
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
  }, [search, current, size, refreshKey]);

  return { page, loading };
}

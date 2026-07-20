"use client";

import { useEffect, useState } from "react";
import { queryWebsitePage } from "@/lib/api/websiteManage";
import type { Page, WebsiteRecord } from "@/types";

// 分页查询网站列表。任一参数或 refreshKey 变化时重拉。
export function useWebsitePage(params: {
  search: string;
  groupName: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, groupName, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<WebsiteRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${groupName}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryWebsitePage({
      search: search || undefined,
      groupName: groupName || undefined,
      current,
      size,
    })
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
  }, [search, groupName, current, size, refreshKey]);

  return { page, loading };
}

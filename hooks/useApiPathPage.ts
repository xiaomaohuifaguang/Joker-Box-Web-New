"use client";

import { useEffect, useState } from "react";
import { queryApiPathPage } from "@/lib/api/apiPath";
import type { ApiPath, Page } from "@/types";

// 分页查询 api 列表。任一参数或 refreshKey 变化时重拉。
export function useApiPathPage(params: {
  search: string;
  roleId: string;
  server: string;
  groupName: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, roleId, server, groupName, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<ApiPath> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${roleId}|${server}|${groupName}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryApiPathPage({
      search: search || undefined,
      roleId: roleId || undefined,
      server: server || undefined,
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
  }, [search, roleId, server, groupName, current, size, refreshKey]);

  return { page, loading };
}

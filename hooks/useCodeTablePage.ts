"use client";

import { useEffect, useState } from "react";
import { queryCodeTablePage } from "@/lib/api/codeTable";
import type { CodeTable, Page } from "@/types";

// 分页查询码表列表。任一筛选/分页/refreshKey 变化时重拉。
export function useCodeTablePage(params: {
  search: string;
  code: string;
  name: string;
  tree: string;
  status: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, code, name, tree, status, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<CodeTable> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${code}|${name}|${tree}|${status}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryCodeTablePage({
      search: search || undefined,
      code: code || undefined,
      name: name || undefined,
      tree: tree || undefined,
      status: status || undefined,
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
  }, [search, code, name, tree, status, current, size, refreshKey]);

  return { page, loading };
}

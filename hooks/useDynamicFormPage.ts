"use client";

import { useEffect, useState } from "react";
import { queryDynamicFormPage } from "@/lib/api/dynamicForm";
import type { DynamicForm, Page } from "@/types";

// 分页查询动态表单列表。任一参数或 refreshKey 变化时重拉。
export function useDynamicFormPage(params: {
  search: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<DynamicForm> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryDynamicFormPage({ search: search || undefined, current, size })
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

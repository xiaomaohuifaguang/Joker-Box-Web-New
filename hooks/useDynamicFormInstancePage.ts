"use client";

import { useEffect, useState } from "react";
import { queryDynamicFormInstancePage } from "@/lib/api/dynamicForm";
import type { DynamicFormInstance, Page } from "@/types";

// 分页查询表单实例（第一版只读列表，无 refreshKey）。任一参数变化时重拉。
export function useDynamicFormInstancePage(params: {
  search: string;
  current: number;
  size: number;
}) {
  const { search, current, size } = params;
  const [page, setPage] = useState<Page<DynamicFormInstance> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${current}|${size}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryDynamicFormInstancePage({ search: search || undefined, current, size })
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
  }, [search, current, size]);

  return { page, loading };
}

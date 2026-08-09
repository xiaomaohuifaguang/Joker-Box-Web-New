"use client";

import { useEffect, useState } from "react";
import { queryAiModelPage } from "@/lib/api/aiModel";
import type { AiModel, AiModelType, Page } from "@/types";

// 分页查询模型列表。任一参数或 refreshKey 变化时重拉。type 空串=全部（传 undefined）。
export function useAiModelPage(params: {
  search: string;
  type: AiModelType | "";
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, type, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<AiModel> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${type}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryAiModelPage({
      search: search || undefined,
      type: type || undefined,
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
  }, [search, type, current, size, refreshKey]);

  return { page, loading };
}

"use client";

import { useEffect, useState } from "react";
import { getDefaultModelSettings, queryAiModelPage } from "@/lib/api/aiModel";
import type { AiModel, AiModelDefaultMap, AiModelType, Page } from "@/types";

// 分页查询模型列表 + 默认模型配置。任一参数或 refreshKey 变化时同帧重拉（列表与默认同源，
// 避免「列表到了、默认没到」的撕裂）。type 空串=全部（传 undefined）。
export function useAiModelPage(params: {
  search: string;
  type: AiModelType | "";
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, type, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<AiModel> | null>(null);
  const [defaults, setDefaults] = useState<AiModelDefaultMap>({});
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
    // 列表与默认配置并行拉取，都 settle 后同帧落地。
    Promise.allSettled([
      queryAiModelPage({
        search: search || undefined,
        type: type || undefined,
        current,
        size,
      }),
      getDefaultModelSettings(),
    ]).then(([pageRes, defaultsRes]) => {
      if (cancelled) return;
      setPage(pageRes.status === "fulfilled" ? pageRes.value : null);
      setDefaults(
        defaultsRes.status === "fulfilled" ? defaultsRes.value : {},
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, type, current, size, refreshKey]);

  return { page, defaults, loading };
}

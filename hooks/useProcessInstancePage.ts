"use client";

import { useEffect, useState } from "react";
import { queryProcessInstancePage } from "@/lib/api/process";
import type {
  ApprovalInstanceType,
  Page,
  ProcessInstance,
  ProcessInstanceType,
} from "@/types";

// 分页查询流程实例（申请中心/审批中心共用）。任一参数或 refreshKey 变化时重拉。
// processCategory：流程分类筛选（前台按路由 [type] 传；空=全部，不传后端）。
export function useProcessInstancePage(params: {
  type: ProcessInstanceType | ApprovalInstanceType;
  search: string;
  current: number;
  size: number;
  refreshKey: number;
  processCategory?: string;
}) {
  const { type, search, current, size, refreshKey, processCategory } = params;
  const [page, setPage] = useState<Page<ProcessInstance> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${type}|${search}|${current}|${size}|${refreshKey}|${processCategory ?? ""}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryProcessInstancePage({
      type,
      search: search || undefined,
      current,
      size,
      processCategory: processCategory || undefined,
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
  }, [type, search, current, size, refreshKey, processCategory]);

  return { page, loading };
}

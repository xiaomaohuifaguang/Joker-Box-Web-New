"use client";

import { useEffect, useState } from "react";
import { listCodeItems } from "@/lib/api/codeTable";
import type { CodeItem } from "@/types";

// 按 tableId 拉码表项（扁平；树形码表由调用方按 parentId 组树）。
// label/status 为可选筛选；refreshKey 变化重拉。
export function useCodeItems(params: {
  tableId: string;
  label: string;
  status: string;
  refreshKey: number;
}) {
  const { tableId, label, status, refreshKey } = params;
  const [items, setItems] = useState<CodeItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  const depKey = `${tableId}|${label}|${status}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    if (!tableId) return;
    let cancelled = false;
    listCodeItems({
      tableId,
      label: label || undefined,
      status: status || undefined,
    })
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, label, status, refreshKey]);

  return { items, loading };
}

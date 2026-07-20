"use client";

import { useEffect, useState } from "react";
import { listFiles } from "@/lib/api/file";
import type { FileItem } from "@/types";

// 文件列表：parentId 或 refreshKey 变化时重拉。失败回落空。
export function useFileList(parentId: string, refreshKey: number) {
  const [items, setItems] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${parentId}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    listFiles(parentId)
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
  }, [parentId, refreshKey]);

  return { items, loading };
}

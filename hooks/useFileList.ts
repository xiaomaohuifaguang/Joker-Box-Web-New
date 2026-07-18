"use client";

import { useEffect, useState } from "react";
import { listFiles } from "@/lib/api/file";
import type { FileItem } from "@/types";

// 文件列表：parentId 或 refreshKey 变化时重拉。失败回落空。
export function useFileList(parentId: string, refreshKey: number) {
  const [items, setItems] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

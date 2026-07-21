"use client";

import { useEffect, useState } from "react";
import { queryCommentPage } from "@/lib/api/ganDaShi";
import type { GanDaShiComment, Page } from "@/types";

// 分页查询评论。parentId 为空查帖子根评论；非空查该评论的子评论。
// 任一参数或 refreshKey 变化时重拉。
export function useComments(params: {
  postId: string;
  parentId: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { postId, parentId, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<GanDaShiComment> | null>(null);
  const [loading, setLoading] = useState(true);

  const depKey = `${postId}|${parentId}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    queryCommentPage({
      postId,
      parentId: parentId || undefined,
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
  }, [postId, parentId, current, size, refreshKey]);

  return { page, loading };
}

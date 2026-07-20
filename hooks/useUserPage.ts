"use client";

import { useEffect, useState } from "react";
import { queryUserPage } from "@/lib/api/user";
import type { Page, UserRecord } from "@/types";

// 分页查询用户列表。任一参数或 refreshKey 变化时重拉。
// orgId 为空（虚拟根 -1）时省略 = 全部用户。
export function useUserPage(params: {
  search: string;
  roleId: string;
  orgId: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, roleId, orgId, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<UserRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${roleId}|${orgId}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryUserPage({
      search: search || undefined,
      roleId: roleId || undefined,
      orgId: orgId || undefined,
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
  }, [search, roleId, orgId, current, size, refreshKey]);

  return { page, loading };
}

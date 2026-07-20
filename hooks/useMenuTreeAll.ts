"use client";

import { useCallback, useEffect, useState } from "react";
import { getMenuTreeAll } from "@/lib/api/menuManage";
import type { MenuNode } from "@/types";

// 全量菜单树（管理用）。menuType 变化重拉；refresh 供增删改/拖拽后刷新。
export function useMenuTreeAll(menuType: number) {
  const [tree, setTree] = useState<MenuNode[] | null>(null);
  const [loading, setLoading] = useState(true);

  // menuType 变化时回到加载态并清树（render 期内条件 setState；effect 内只在异步回调 setState）。
  const [prevType, setPrevType] = useState(menuType);
  if (prevType !== menuType) {
    setPrevType(menuType);
    setLoading(true);
    setTree(null);
  }

  // 核心拉取：setState 仅在 .then/.catch/.finally 回调内。
  const fetchTree = useCallback((alive: () => boolean) => {
    getMenuTreeAll(menuType)
      .then((data) => {
        if (alive()) setTree(data ?? []);
      })
      .catch(() => {
        if (alive()) setTree([]);
      })
      .finally(() => {
        if (alive()) setLoading(false);
      });
  }, [menuType]);

  // 手动刷新（事件式调用）：sync setLoading 在非 effect 上下文允许。
  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetchTree(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchTree]);

  // 挂载/menuType 变化拉取：loading 已由 render 期置 true，effect 内只在异步回调 setState。
  useEffect(() => {
    let cancelled = false;
    fetchTree(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchTree]);

  return { tree, loading, refresh };
}

"use client";

import { useEffect, useState } from "react";
import { getWebsiteGroups } from "@/lib/api/website";
import type { WebsiteGroup } from "@/types";

// 拉取收藏网站分组。失败回落空数组（页面显示空态）。
export function useWebsiteGroups() {
  const [groups, setGroups] = useState<WebsiteGroup[] | null>(null);
  const [loading, setLoading] = useState(true);

  // 挂载拉取一次：loading 初值已为 true，effect 内只在异步回调 setState（避免 effect 内 sync setState）。
  useEffect(() => {
    let cancelled = false;
    getWebsiteGroups()
      .then((data) => {
        if (!cancelled) setGroups(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { groups, loading };
}

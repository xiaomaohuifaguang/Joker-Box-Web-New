"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  getApiReqTotal,
  getPeopleCount,
  getPeopleCreateByDay,
} from "@/lib/api/statistics";
import type { ChartData, PeopleCount } from "@/types";

// 展板单个数据区（KPI / 图表）的加载状态：三路接口独立请求、独立容错，
// 任一失败只影响对应卡片，不拖垮整页。
export interface BoardSection<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: BoardSection<never> = { data: null, loading: true, error: null };

function toMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "加载失败";
}

// 数据展板统计：peopleCount / peopleCreateByDay / apiReqTotal 三路并发拉取，
// refresh() 手动重拉全部；updatedAt 记录三路全部落定的时间。
export function useDisplayBoardStats() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [people, setPeople] = useState<BoardSection<PeopleCount>>(INITIAL);
  const [registerTrend, setRegisterTrend] =
    useState<BoardSection<ChartData>>(INITIAL);
  const [apiReqTop, setApiReqTop] = useState<BoardSection<ChartData>>(INITIAL);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // 刷新时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const [prevKey, setPrevKey] = useState(refreshKey);
  if (prevKey !== refreshKey) {
    setPrevKey(refreshKey);
    setPeople((s) => ({ ...s, loading: true, error: null }));
    setRegisterTrend((s) => ({ ...s, loading: true, error: null }));
    setApiReqTop((s) => ({ ...s, loading: true, error: null }));
  }

  useEffect(() => {
    let cancelled = false;
    let settled = 0;
    const done = () => {
      settled += 1;
      if (!cancelled && settled === 3) setUpdatedAt(new Date());
    };

    getPeopleCount()
      .then((data) => {
        if (!cancelled) setPeople({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setPeople({ data: null, loading: false, error: toMessage(err) });
      })
      .finally(done);

    getPeopleCreateByDay()
      .then((data) => {
        if (!cancelled) setRegisterTrend({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setRegisterTrend({
            data: null,
            loading: false,
            error: toMessage(err),
          });
      })
      .finally(done);

    getApiReqTotal()
      .then((data) => {
        if (!cancelled) setApiReqTop({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setApiReqTop({ data: null, loading: false, error: toMessage(err) });
      })
      .finally(done);

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  const loading = people.loading || registerTrend.loading || apiReqTop.loading;

  return { people, registerTrend, apiReqTop, updatedAt, loading, refresh };
}

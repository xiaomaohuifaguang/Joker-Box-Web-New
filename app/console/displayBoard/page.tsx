"use client";

import { RefreshCw, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDisplayBoardStats } from "@/hooks/useDisplayBoardStats";
import { cn } from "@/lib/utils";
import { ApiTopChart } from "./_components/ApiTopChart";
import { RegisterTrendChart } from "./_components/RegisterTrendChart";
import { StatCard } from "./_components/StatCard";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// 数据展板：统计展示页（常规后台页，跟随主题）。
// 数据源 /statisticalCenter/* 三路接口（见 useDisplayBoardStats），仅手动刷新。
export default function DisplayBoardPage() {
  const { people, registerTrend, apiReqTop, updatedAt, loading, refresh } =
    useDisplayBoardStats();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">数据展板</h1>
        {updatedAt && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            数据更新于 {pad(updatedAt.getHours())}:{pad(updatedAt.getMinutes())}:
            {pad(updatedAt.getSeconds())}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          className="ml-auto"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="系统总用户数"
          value={people.data?.total ?? null}
          loading={people.loading}
          error={people.error}
          onRetry={refresh}
        />
        <StatCard
          icon={UserPlus}
          label="今日注册"
          value={people.data?.todayRegister ?? null}
          loading={people.loading}
          error={people.error}
          onRetry={refresh}
        />
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RegisterTrendChart
          data={registerTrend.data}
          loading={registerTrend.loading}
          error={registerTrend.error}
          onRetry={refresh}
        />
        <ApiTopChart
          data={apiReqTop.data}
          loading={apiReqTop.loading}
          error={apiReqTop.error}
          onRetry={refresh}
        />
      </div>
    </div>
  );
}

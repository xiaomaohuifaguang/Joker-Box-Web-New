"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartData } from "@/types";
import { ChartBodyState } from "./ChartBodyState";
import { ChartCard } from "./ChartCard";

// 颜色走 @theme 预留的 --color-chart-*（= brand/brand-2），11 套预设自动跟随。
const chartConfig = {
  count: { label: "新注册", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

// 近 7 天新注册用户：面积图（品牌色渐变填充），x=日期、y=注册数。
export function RegisterTrendChart({
  data,
  loading,
  error,
  onRetry,
}: {
  data: ChartData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  // ydata 后端声明 Object 实际数值，Number() 兜底非数值/缺失。
  const points = useMemo(
    () =>
      (data?.xdata ?? []).map((name, i) => ({
        name,
        count: Number(data?.ydata[i]) || 0,
      })),
    [data],
  );

  return (
    <ChartCard title="近 7 天新注册用户" subtitle="按日统计">
      {loading || error || points.length === 0 ? (
        <ChartBodyState
          loading={loading}
          error={error}
          empty={points.length === 0}
          onRetry={onRetry}
        />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
          <AreaChart
            data={points}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="registerFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={40}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              fill="url(#registerFill)"
              dot={{ r: 3, fill: "var(--color-count)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

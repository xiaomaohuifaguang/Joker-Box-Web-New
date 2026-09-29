"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartData } from "@/types";
import { ChartBodyState } from "./ChartBodyState";
import { ChartCard } from "./ChartCard";

const chartConfig = {
  count: { label: "请求次数", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

// API 请求 TOP10：横向条形图（接口名放纵轴）。
// 两个坑：
// 1) recharts 分类轴对相同类别值去重——TOP10 若有重名接口，同名行会叠在一起
//    （肉眼可见"少了"），所以重名追加零宽空格让 key 唯一、显示不变；
// 2) 名称不截断全显，轴宽按最长名估算（封顶 280px）。
export function ApiTopChart({
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
  const { points, axisWidth } = useMemo(() => {
    const seen = new Map<string, number>();
    const pts = (data?.xdata ?? []).map((raw, i) => {
      const dup = seen.get(raw) ?? 0;
      seen.set(raw, dup + 1);
      return {
        name: raw + "\u200B".repeat(dup),
        count: Number(data?.ydata[i]) || 0,
      };
    });
    const longest = pts.reduce((m, p) => Math.max(m, p.name.length), 0);
    return {
      points: pts,
      axisWidth: Math.min(280, Math.max(140, Math.ceil(longest * 7.2))),
    };
  }, [data]);

  return (
    <ChartCard title="API 请求 TOP 10" subtitle="按请求次数">
      {loading || error || points.length === 0 ? (
        <ChartBodyState
          loading={loading}
          error={error}
          empty={points.length === 0}
          onRetry={onRetry}
        />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
          <BarChart
            data={points}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={axisWidth}
              tickLine={false}
              axisLine={false}
              fontSize={12}
              interval={0}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

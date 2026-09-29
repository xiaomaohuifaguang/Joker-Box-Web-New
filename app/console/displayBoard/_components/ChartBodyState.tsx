"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// 图表内容区三态占位：加载中 / 失败重试 / 暂无数据。有数据可渲染时返回 null。
export function ChartBodyState({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
}) {
  if (!loading && !error && !empty) return null;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          加载中…
        </>
      ) : error ? (
        <>
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            重试
          </Button>
        </>
      ) : (
        "暂无数据"
      )}
    </div>
  );
}

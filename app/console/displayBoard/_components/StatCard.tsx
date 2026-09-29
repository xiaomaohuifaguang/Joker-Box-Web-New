import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// KPI 统计卡：图标 + 标题 + 大数字（常规后台卡片，跟随主题）。
export function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  error,
  onRetry,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : error ? (
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-normal text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
              >
                {error}，点击重试
              </button>
            ) : (
              (value ?? 0).toLocaleString()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

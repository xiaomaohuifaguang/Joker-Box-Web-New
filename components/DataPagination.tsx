"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50];

// 页码：总页数 ≤7 全显示；否则首尾各保留 + 当前页窗口，中间用省略号。
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// 列表分页条：总数 + 每页条数 + 页码。手机上页码收成「当前/总数」。
export function DataPagination({
  current,
  size,
  total,
  onCurrentChange,
  onSizeChange,
  className,
}: {
  current: number;
  size: number;
  total: number;
  onCurrentChange: (page: number) => void;
  /** 由调用方决定是否回到第 1 页 */
  onSizeChange: (size: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="tabular-nums">共 {total.toLocaleString()} 条</span>
      <div className="ml-auto flex items-center gap-1">
        <Select value={String(size)} onValueChange={(v) => onSizeChange(Number(v))}>
          <SelectTrigger size="sm" className="mr-1 w-28" aria-label="每页条数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} 条/页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={current <= 1}
          onClick={() => onCurrentChange(Math.max(1, current - 1))}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 tabular-nums sm:hidden">
          {current} / {totalPages}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          {getPageNumbers(current, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === current ? "default" : "outline"}
                size="sm"
                aria-current={p === current ? "page" : undefined}
                className="min-w-8 px-1.5 tabular-nums"
                onClick={() => onCurrentChange(p)}
              >
                {p}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={current >= totalPages}
          onClick={() => onCurrentChange(Math.min(totalPages, current + 1))}
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

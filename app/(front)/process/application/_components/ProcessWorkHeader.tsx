"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
} from "@/types";

// 工单头：流程详情/处理页顶部的「批办单头」。
// 编号（font-mono + № 钢印）为主视觉，状态做成微倾斜印章徽标（motion-safe；reduced-motion/打印回正）。
// 颜色全走 token，不写死 hex，跟随多维主题预设。
export function ProcessWorkHeader({
  code,
  title,
  subtitle,
  processStatus,
  className,
}: {
  /** 流程编号（工单号） */
  code?: string;
  /** 工单标题 */
  title?: string;
  /** 副标（流程名 · 版本等，一行） */
  subtitle?: string;
  /** 流程状态（决定状态章 label/variant） */
  processStatus?: string;
  className?: string;
}) {
  const st =
    PROCESS_INSTANCE_STATUS[processStatus ?? ""] ??
    PROCESS_INSTANCE_STATUS_FALLBACK;
  return (
    <header className={cn("border-b border-border/60 pb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {/* 工单号：钢印感（mono + № + 加宽字距） */}
          <p className="font-mono text-sm font-medium tracking-widest text-muted-foreground">
            <span className="mr-1 text-foreground/70">№</span>
            {code || "—"}
          </p>
          <h1 className="mt-1.5 truncate font-display text-2xl font-semibold">
            {title || "未命名流程"}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {/* 状态章：微倾斜像盖上去的章；reduced-motion/打印回正 */}
        <Badge
          variant={st.variant}
          className="motion-safe:-rotate-2 mt-1 shrink-0 px-2.5 py-1 text-xs motion-safe:shadow-sm motion-safe:print:rotate-0"
        >
          {st.label}
        </Badge>
      </div>
    </header>
  );
}

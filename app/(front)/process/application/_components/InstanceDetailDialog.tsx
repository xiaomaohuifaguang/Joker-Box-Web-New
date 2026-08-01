"use client";

import { useEffect, useState } from "react";
import { getProcessInstanceInfo } from "@/lib/api/process";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstance,
} from "@/types";

// 查看实例详情对话框：只读展示。打开时按 id 调 /processInstance/info（不含创建人，第一版）。
export function InstanceDetailDialog({
  instanceId,
  open,
  onOpenChange,
}: {
  instanceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(false);

  // 每次打开（目标 id 变化）时重置数据并进入加载态：render 期比较，effect 内只在异步回调 setState。
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = open && instanceId != null ? String(instanceId) : null;
  if (prevKey !== key) {
    setPrevKey(key);
    setDetail(null);
    setLoading(key != null);
  }

  useEffect(() => {
    if (!open || instanceId == null) return;
    let cancelled = false;
    getProcessInstanceInfo(instanceId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, instanceId]);

  const st =
    PROCESS_INSTANCE_STATUS[detail?.processStatus ?? ""] ??
    PROCESS_INSTANCE_STATUS_FALLBACK;

  const rows: { label: string; value: React.ReactNode }[] = detail
    ? [
        { label: "编号", value: detail.code || "-" },
        { label: "标题", value: detail.title || "-" },
        { label: "流程", value: detail.processDefinitionName || "-" },
        { label: "版本", value: detail.processDefinitionVersion || "-" },
        {
          label: "状态",
          value: <Badge variant={st.variant}>{st.label}</Badge>,
        },
        { label: "创建时间", value: detail.createTime || "-" },
        { label: "更新时间", value: detail.updateTime || "-" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>流程详情</DialogTitle>
          <DialogDescription>
            {detail?.processDefinitionName ?? ""}
            {detail?.processDefinitionVersion
              ? ` · v${detail.processDefinitionVersion}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : detail == null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            加载失败
          </p>
        ) : (
          <dl className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3 text-sm">
                <dt className="w-20 shrink-0 text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 flex-1 break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

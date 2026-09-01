"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getSysPromptInfo } from "@/lib/api/systemPrompt";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { SystemPrompt } from "@/types";

// 查看系统提示详情：打开即 loading 拉 /systemPrompt/info，失败给重试（不展示空内容）。
export function SystemPromptDetailDialog({
  detail,
  onClose,
}: {
  /** 要查看的行（仅取 id 拉详情）；null = 关闭。 */
  detail: SystemPrompt | null;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<SystemPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // 重试计数：+1 触发 effect 重新拉详情。
  const [reloadKey, setReloadKey] = useState(0);

  const open = detail !== null;
  const detailId = detail?.id ?? null;

  // 打开/切换行时重置为加载态（render 期内条件 setState；effect 内只异步 setState）。
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== detailId) {
    setPrev({ open, id: detailId });
    if (open) {
      setLoading(true);
      setLoadError(false);
      setInfo(null);
    }
  }

  useEffect(() => {
    if (!open || detailId == null) return;
    let cancelled = false;
    getSysPromptInfo(detailId)
      .then((d) => {
        if (!cancelled) setInfo(d);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "加载详情失败");
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, detailId, reloadKey]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>系统提示详情</DialogTitle>
          <DialogDescription>全局公告的完整内容。</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载详情失败</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoadError(false);
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              重试
            </Button>
          </div>
        ) : info ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap break-words">
              {info.prompt}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">创建人</dt>
              <dd>{info.createByName || info.createBy || "-"}</dd>
              <dt className="text-muted-foreground">创建时间</dt>
              <dd>{info.createTime ?? "-"}</dd>
              <dt className="text-muted-foreground">截止时间</dt>
              <dd>{info.deadTime ?? "-"}</dd>
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

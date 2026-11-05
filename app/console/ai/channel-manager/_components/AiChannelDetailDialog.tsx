"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { getAiChannelInfo } from "@/lib/api/aiChannel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiChannel } from "@/types";

// 查看渠道完整详情；打开即加载，失败时不展示空内容并提供重试。
export function AiChannelDetailDialog({
  detail,
  onClose,
}: {
  detail: AiChannel | null;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<AiChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const open = detail !== null;
  const detailId = detail?.id ?? null;
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
    getAiChannelInfo({ id: detailId })
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : "加载详情失败");
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>渠道详情</DialogTitle>
          <DialogDescription>查看渠道及供应商配置。</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
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
                setReloadKey((key) => key + 1);
              }}
            >
              重试
            </Button>
          </div>
        ) : info ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="mb-1 text-muted-foreground">渠道 ID</dt>
              <dd>{info.id}</dd>
            </div>
            <div>
              <dt className="mb-1 text-muted-foreground">渠道名称</dt>
              <dd className="break-words">{info.name || "-"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-muted-foreground">渠道类型</dt>
              <dd>{info.isCustom ? "自定义渠道" : "供应商渠道"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-muted-foreground">供应商</dt>
              <dd className="break-words">
                {info.isCustom ? "自定义渠道" : info.providerName || "-"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-muted-foreground">供应商 ID</dt>
              <dd>{info.isCustom ? "-" : info.providerId ?? "-"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-muted-foreground">API Key</dt>
              <dd className="break-all">{info.apiKey || "-"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mb-1 text-muted-foreground">自定义 BaseUrl</dt>
              <dd className="break-all">{info.baseUrl || "-"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mb-1 text-muted-foreground">供应商 BaseUrl</dt>
              <dd className="break-all">{info.providerBaseUrl || "-"}</dd>
            </div>
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

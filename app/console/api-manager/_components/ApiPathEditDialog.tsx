"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateApiPath } from "@/lib/api/apiPath";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ApiPath } from "@/types";

// 编辑 api（仅白名单可改）。
export function ApiPathEditDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApiPath | null;
  onSuccess: () => void;
}) {
  const [whiteList, setWhiteList] = useState(false);
  const [loading, setLoading] = useState(false);

  // 打开/换行时回填白名单（render 期内条件 setState，避免 effect 内 sync setState）。
  const [prev, setPrev] = useState<{ open: boolean; item: ApiPath | null }>({
    open: false,
    item: null,
  });
  if (prev.open !== open || prev.item !== item) {
    setPrev({ open, item });
    if (open && item) setWhiteList(item.whiteList === "1");
  }

  async function handleSubmit() {
    if (!item) return;
    setLoading(true);
    try {
      await updateApiPath({
        server: item.server,
        path: item.path,
        whiteList: whiteList ? "1" : "0",
      });
      toast.success("已更新");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "更新失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑 API</DialogTitle>
          <DialogDescription>仅可修改白名单状态。</DialogDescription>
        </DialogHeader>
        {item && (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">名称</span>
              <span className="font-medium">{item.name || "-"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">路径</span>
              <span className="font-mono text-xs break-all">{item.path}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">服务</span>
              <span>{item.server}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground">分组</span>
              <span className="text-muted-foreground">{item.groupName || "-"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="whiteList" className="text-sm">
                  白名单
                </Label>
                <span className="text-xs text-muted-foreground">
                  白名单 api 无需权限校验
                </span>
              </div>
              <Switch
                id="whiteList"
                checked={whiteList}
                onCheckedChange={setWhiteList}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

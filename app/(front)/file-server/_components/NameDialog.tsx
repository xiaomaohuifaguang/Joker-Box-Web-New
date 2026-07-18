"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// 单文本输入弹窗：供「新建文件夹」「重命名」复用。
// onConfirm 抛错则提示并保持打开；成功则关闭。
export function NameDialog({
  open,
  onOpenChange,
  title,
  initialValue,
  confirmText,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initialValue: string;
  confirmText: string;
  onConfirm: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  // 打开时回填
  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  async function submit() {
    const v = value.trim();
    if (!v) return;
    setLoading(true);
    try {
      await onConfirm(v);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="名称"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={loading || !value.trim()}>
            {loading ? "处理中…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

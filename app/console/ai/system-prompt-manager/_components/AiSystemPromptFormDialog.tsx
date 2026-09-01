"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addSystemPrompt,
  getSystemPromptInfo,
  updateSystemPrompt,
} from "@/lib/api/aiSystemPrompt";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AiSystemPrompt, AiSystemPromptPayload } from "@/types";

const EMPTY: AiSystemPromptPayload = { description: "", prompt: "" };

// 新增 / 编辑系统提示词。editing 非 null 时为编辑：开弹窗即 loading，/ai/systemPrompt/info
// 返回后回填 description+prompt。两字段均必填。
export function AiSystemPromptFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiSystemPrompt | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AiSystemPromptPayload>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  // 详情加载失败标记：失败时不展示空表单（防覆盖已有提示词），给重试入口。
  const [infoError, setInfoError] = useState(false);
  // 重试计数：+1 触发 effect 重新拉详情。
  const [reloadKey, setReloadKey] = useState(0);

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      // 编辑：先 loading（清旧值防闪现），effect 异步拉详情回填；新增：直接空表单。
      setDetailLoading(!!editing);
      setInfoError(false);
      setForm(EMPTY);
    }
  }

  useEffect(() => {
    if (!open || editingId == null) return;
    let cancelled = false;
    getSystemPromptInfo(editingId)
      .then((d) => {
        if (cancelled) return;
        setForm({ description: d.description ?? "", prompt: d.prompt ?? "" });
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "加载详情失败");
          setInfoError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editingId, reloadKey]);

  function set<K extends keyof AiSystemPromptPayload>(
    key: K,
    value: AiSystemPromptPayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.description.trim()) {
      toast.error("请输入描述");
      return;
    }
    if (!form.prompt.trim()) {
      toast.error("请输入提示词");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateSystemPrompt({
          id: editing.id,
          description: form.description.trim(),
          prompt: form.prompt,
        });
        toast.success("已保存");
      } else {
        await addSystemPrompt({
          description: form.description.trim(),
          prompt: form.prompt,
        });
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑提示词" : "新增提示词"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改系统提示词。" : "新建一条系统提示词。"}
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : infoError ? (
          // 详情加载失败：不展示空表单，避免保存时覆盖已有提示词。
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载提示词详情失败</p>
            <Button
              variant="outline"
              onClick={() => {
                setInfoError(false);
                setDetailLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              重试
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">描述 *</Label>
              <Input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="一句话说明这条提示词的用途"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">提示词 *</Label>
              <Textarea
                value={form.prompt}
                onChange={(e) => set("prompt", e.target.value)}
                placeholder="系统提示词内容"
                className="field-sizing-fixed h-[50vh] max-h-[60vh] resize-y font-mono text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={busy || detailLoading || infoError}
          >
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

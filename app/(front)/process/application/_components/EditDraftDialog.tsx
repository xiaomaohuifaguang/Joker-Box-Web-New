"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  getProcessInstanceInfo,
  saveProcessDraft,
  startProcessInstance,
} from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 编辑草稿对话框：按 id 回填标题，改后「存草稿」或「发起」（body 均带 processInstanceId 提交既有草稿）。
export function EditDraftDialog({
  instanceId,
  open,
  onOpenChange,
  onDone,
}: {
  instanceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [definitionId, setDefinitionId] = useState<number | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaVersion, setMetaVersion] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  // 每次打开（目标 id 变化）时进入加载态：render 期比较，effect 内只在异步回调 setState。
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = open && instanceId != null ? String(instanceId) : null;
  if (prevKey !== key) {
    setPrevKey(key);
    setLoading(key != null);
  }

  // 打开时回填草稿标题与所属流程。
  useEffect(() => {
    if (!open || instanceId == null) return;
    let cancelled = false;
    getProcessInstanceInfo(instanceId)
      .then((data) => {
        if (cancelled) return;
        setDefinitionId(data.processDefinitionId ?? null);
        setMetaName(data.processDefinitionName ?? "");
        setMetaVersion(data.processDefinitionVersion ?? "");
        setTitle(data.title ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setDefinitionId(null);
        toast.error("加载草稿失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, instanceId]);

  async function submit(kind: "start" | "draft") {
    if (instanceId == null || definitionId == null || submitting) return;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definitionId,
        processInstanceId: instanceId,
        title: title.trim() || undefined,
      };
      if (kind === "start") await startProcessInstance(payload);
      else await saveProcessDraft(payload);
      toast.success(kind === "start" ? "已发起" : "已存草稿");
      onOpenChange(false);
      onDone(kind);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : kind === "start"
            ? "发起失败"
            : "保存失败",
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑草稿</DialogTitle>
          <DialogDescription>
            {metaName || "未命名流程"}
            {metaVersion ? ` · v${metaVersion}` : ""}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-muted-foreground">流程标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="可留空，由系统自动生成"
              maxLength={100}
            />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={loading || submitting != null}
            onClick={() => submit("draft")}
          >
            {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            存草稿
          </Button>
          <Button
            disabled={loading || submitting != null}
            onClick={() => submit("start")}
          >
            {submitting === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
            发起
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

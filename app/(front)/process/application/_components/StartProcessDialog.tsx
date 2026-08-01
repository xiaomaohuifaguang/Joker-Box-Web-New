"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { saveProcessDraft, startProcessInstance } from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeployedProcessDefinition } from "@/types";

// 发起/存草稿对话框：输入流程标题（可空，后端兜底），两个提交动作。第一版只发标题，不带表单数据。
export function StartProcessDialog({
  definition,
  open,
  onOpenChange,
  onDone,
}: {
  definition: DeployedProcessDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  async function submit(kind: "start" | "draft") {
    if (definition?.id == null || submitting) return;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definition.id,
        title: title.trim() || undefined,
      };
      if (kind === "start") await startProcessInstance(payload);
      else await saveProcessDraft(payload);
      toast.success(kind === "start" ? "已发起" : "已存草稿");
      onOpenChange(false);
      setTitle("");
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
          <DialogTitle>发起流程</DialogTitle>
          <DialogDescription>
            {definition?.processName ?? "未命名流程"}
            {definition?.version ? ` · v${definition.version}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">流程标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可留空，由系统自动生成"
            maxLength={100}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            disabled={submitting != null}
            onClick={() => submit("draft")}
          >
            {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            存草稿
          </Button>
          <Button disabled={submitting != null} onClick={() => submit("start")}>
            {submitting === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
            发起
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

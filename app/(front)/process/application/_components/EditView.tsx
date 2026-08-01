"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { Container } from "@/components/Container";

// 编辑草稿视图：按 id 回填标题，改后存草稿/发起（body 带 processInstanceId 提交既有草稿）。
export function EditView({
  instanceId,
  onBack,
  onDone,
}: {
  instanceId: number;
  onBack: () => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [definitionId, setDefinitionId] = useState<number | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaVersion, setMetaVersion] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  const [prevId, setPrevId] = useState(instanceId);
  if (prevId !== instanceId) {
    setPrevId(instanceId);
    setLoading(true);
  }

  useEffect(() => {
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
  }, [instanceId]);

  async function submit(kind: "start" | "draft") {
    if (definitionId == null || submitting) return;
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
    <Container className="py-8 md:py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">编辑草稿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {metaName}
          {metaVersion ? ` · v${metaVersion}` : ""}
        </p>
      </header>
      {loading ? (
        <Skeleton className="h-9 w-full max-w-md" />
      ) : (
        <div className="flex max-w-md flex-col gap-2">
          <label className="text-sm text-muted-foreground">流程标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可留空，由系统自动生成"
            maxLength={100}
          />
          <div className="mt-4 flex gap-2">
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
          </div>
        </div>
      )}
    </Container>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
import type { DynamicFormRendererHandle } from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";
import {
  hasProcessForm,
  seedProcessFormValues,
  ProcessFormFields,
} from "./ProcessForm";
import type { TaskFormVO } from "@/types";

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
  const [form, setForm] = useState<TaskFormVO | undefined>(undefined);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  const showForm = hasProcessForm(form);

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
        setForm(data.taskForm);
        setValues(seedProcessFormValues(data.taskForm));
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
    if (showForm && kind === "start") {
      const errs = rendererRef.current?.validate() ?? {};
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        toast.error("请完善表单必填项");
        return;
      }
    }
    const globalFormData = showForm
      ? (rendererRef.current?.collectAllData() ?? {})
      : undefined;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definitionId,
        processInstanceId: instanceId,
        title: title.trim() || undefined,
        ...(globalFormData ? { globalFormData } : {}),
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
        <Skeleton className="h-9 w-full" />
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">流程标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可留空，由系统自动生成"
            maxLength={100}
            className="max-w-md"
          />
          {showForm && form && (
            <div className="mt-6">
              <ProcessFormFields
                form={form}
                values={values}
                errors={errors}
                onChange={(id, v) => {
                  setValues((s) => ({ ...s, [id]: v }));
                  setErrors((e) => {
                    if (!(id in e)) return e;
                    const next = { ...e };
                    delete next[id];
                    return next;
                  });
                }}
                rendererRef={rendererRef}
              />
            </div>
          )}
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

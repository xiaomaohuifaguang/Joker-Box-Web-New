"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  getProcessDefinitionStartInfo,
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
import {
  NextTaskCandidatePicker,
  missingChooseNodes,
} from "./NextTaskCandidatePicker";
import type { ProcessStartInfo } from "@/types";

// 发起流程视图：按 definitionId 调 startInfo 取流程名/版本 + 发起表单，填标题后发起/存草稿。
// 发起时校验表单必填；存草稿不校验，仅收集 globalFormData。
export function StartView({
  definitionId,
  onBack,
  onDone,
}: {
  definitionId: number;
  onBack: () => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [info, setInfo] = useState<ProcessStartInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 下一用户任务候选人选择（7/8/9）：nodeId -> 选中人员 id 集合。
  const [choose, setChoose] = useState<Record<string, number[]>>({});
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  const showForm = hasProcessForm(info?.startForm);

  // definitionId 变化时重新进入加载态（render 期比较；effect 内只在异步回调 setState）。
  const [prevId, setPrevId] = useState(definitionId);
  if (prevId !== definitionId) {
    setPrevId(definitionId);
    setInfo(null);
    setLoading(true);
    setChoose({});
  }

  useEffect(() => {
    let cancelled = false;
    getProcessDefinitionStartInfo(definitionId)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setValues(seedProcessFormValues(data.startForm));
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [definitionId]);

  async function submit(kind: "start" | "draft") {
    if (submitting) return;
    if (showForm && kind === "start") {
      const errs = rendererRef.current?.validate() ?? {};
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        toast.error("请完善表单必填项");
        return;
      }
    }
    // 发起时校验 7/8/9 候选人已选；存草稿不校验。
    if (kind === "start") {
      const missing = missingChooseNodes(info?.nextUserTaskInfos, choose);
      if (missing.length > 0) {
        toast.error(`请为以下节点选择处理人：${missing.join("、")}`);
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
        title: title.trim() || undefined,
        ...(globalFormData ? { globalFormData } : {}),
        ...(Object.keys(choose).length > 0 ? { nodeCandidateUsersChoose: choose } : {}),
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
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">
              发起流程{info?.processName ? ` · ${info.processName}` : ""}
            </h1>
            {info?.version && (
              <p className="mt-1 text-sm text-muted-foreground">v{info.version}</p>
            )}
          </>
        )}
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-muted-foreground">流程标题</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="可留空，由系统自动生成"
          maxLength={100}
          className="max-w-md"
        />
        {showForm && info?.startForm && (
          <div className="mt-6">
            <ProcessFormFields
              form={info.startForm}
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
        {!loading && (
          <NextTaskCandidatePicker
            infos={info?.nextUserTaskInfos}
            value={choose}
            disabled={submitting != null}
            onChange={(nodeId, ids) => setChoose((s) => ({ ...s, [nodeId]: ids }))}
          />
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            disabled={loading || submitting != null}
            onClick={() => submit("draft")}
          >
            {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            存草稿
          </Button>
          <Button disabled={loading || submitting != null} onClick={() => submit("start")}>
            {submitting === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
            发起
          </Button>
        </div>
      </div>
    </Container>
  );
}

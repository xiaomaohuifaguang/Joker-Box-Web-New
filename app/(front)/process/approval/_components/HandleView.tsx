"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getProcessInstanceInfo } from "@/lib/api/process";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";
import type { DynamicFormRendererHandle } from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";
import {
  hasProcessForm,
  seedProcessFormValues,
  ProcessFormFields,
} from "../../application/_components/ProcessForm";
import {
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstance,
} from "@/types";

// 处理任务视图（待办进入）：可编辑表单 + 始终引入联动（填写态，无「按联动显示」开关）。
// 审批操作按钮（同意/驳回等）后续接入。
export function HandleView({
  instanceId,
  taskId,
  onBack,
}: {
  instanceId: number;
  taskId?: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  const [prevKey, setPrevKey] = useState(`${instanceId}|${taskId ?? ""}`);
  const depKey = `${instanceId}|${taskId ?? ""}`;
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setDetail(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    getProcessInstanceInfo(instanceId, taskId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setValues(seedProcessFormValues(data.taskForm));
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId, taskId]);

  const st =
    PROCESS_INSTANCE_STATUS[detail?.processStatus ?? ""] ??
    PROCESS_INSTANCE_STATUS_FALLBACK;
  const showForm = hasProcessForm(detail?.taskForm);

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
              处理任务{detail?.title ? ` · ${detail.title}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail?.processDefinitionName ?? ""}
              {detail?.processDefinitionVersion ? ` · v${detail.processDefinitionVersion}` : ""}
              {detail?.code ? ` · ${detail.code}` : ""}
              <Badge variant={st.variant} className="ml-2 align-middle">{st.label}</Badge>
            </p>
          </>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : detail == null ? (
        <p className="py-6 text-sm text-muted-foreground">加载失败</p>
      ) : (
        <>
          {showForm && detail.taskForm && (
            <ProcessFormFields
              form={detail.taskForm}
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
          )}
          {/* 审批操作按钮（同意/驳回等）后续接入 */}
        </>
      )}
    </Container>
  );
}

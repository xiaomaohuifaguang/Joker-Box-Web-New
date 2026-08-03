"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  getProcessInstanceInfo,
  passProcessTask,
  rejectProcessTask,
  backProcessTask,
} from "@/lib/api/process";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Container } from "@/components/Container";
import type { DynamicFormRendererHandle } from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";
import {
  hasProcessForm,
  seedProcessFormValues,
  ProcessFormFields,
} from "../../application/_components/ProcessForm";
import {
  PROCESS_BUTTON_ACTIONS,
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstance,
} from "@/types";

// 处理任务视图（待办进入）：可编辑表单 + 始终引入联动（填写态，无「按联动显示」开关）。
// 审批操作（pass 通过 / reject 拒绝 / back 驳回）点按钮弹确认框（可填审批意见），确认后调对应接口。
export function HandleView({
  instanceId,
  taskId,
  onBack,
  onDone,
}: {
  instanceId: number;
  taskId?: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  // 待确认的动作（点开确认框）；提交中；审批意见；驳回目标节点（仅 backType=choose）。
  const [confirmAction, setConfirmAction] = useState<
    "pass" | "reject" | "back" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [remark, setRemark] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");

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
  // 可用审批按钮（后端 buttonActions 控制）；未知动作不渲染。
  const actions = (detail?.buttonActions ?? []).filter(
    (a) => PROCESS_BUTTON_ACTIONS[a] != null,
  );
  // 驳回方式：choose 时需用户从 availableBackTargets 选目标节点；prev/specific 直接驳回。
  const backConfig = detail?.backConfig;
  const backTargets = backConfig?.availableBackTargets ?? [];

  // 点按钮 -> 开确认框（清空意见/节点）。
  function openConfirm(action: "pass" | "reject" | "back") {
    setRemark("");
    setTargetNodeId("");
    setConfirmAction(action);
  }

  // 确认提交：pass 校验表单必填带 globalFormData；reject 只带 remark；back 在 choose 时必带 targetNodeId。
  async function submit() {
    if (confirmAction == null || submitting || taskId == null) return;
    let globalFormData: Record<string, unknown> | undefined;
    if (confirmAction === "pass" && showForm) {
      const errs = rendererRef.current?.validate() ?? {};
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        toast.error("请完善表单必填项");
        return;
      }
      globalFormData = rendererRef.current?.collectAllData() ?? {};
    }
    if (
      confirmAction === "back" &&
      backConfig?.backType === "choose" &&
      !targetNodeId
    ) {
      toast.error("请选择驳回的目标节点");
      return;
    }
    setSubmitting(true);
    const payload = {
      processInstanceId: instanceId,
      taskId,
      remark: remark.trim() || undefined,
      ...(globalFormData ? { globalFormData } : {}),
      ...(confirmAction === "back" && backConfig?.backType === "choose"
        ? { targetNodeId }
        : {}),
    };
    const LABEL: Record<"pass" | "reject" | "back", string> = {
      pass: "通过",
      reject: "拒绝",
      back: "驳回",
    };
    try {
      if (confirmAction === "pass") await passProcessTask(payload);
      else if (confirmAction === "reject") await rejectProcessTask(payload);
      else await backProcessTask(payload);
      toast.success(`已${LABEL[confirmAction]}`);
      setConfirmAction(null);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : `${LABEL[confirmAction]}失败`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMeta =
    confirmAction != null ? PROCESS_BUTTON_ACTIONS[confirmAction] : null;

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
          {actions.length > 0 && (
            <div className="mt-8 flex gap-2">
              {actions.map((a) => {
                const meta = PROCESS_BUTTON_ACTIONS[a];
                return (
                  <Button
                    key={a}
                    variant={meta.variant}
                    onClick={() => openConfirm(a as "pass" | "reject" | "back")}
                  >
                    {meta.label}
                  </Button>
                );
              })}
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={confirmAction != null}
        onOpenChange={(open) => {
          if (!open && !submitting) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认{confirmMeta?.label ?? ""}？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "pass"
                ? "通过后流程将进入下一节点。"
                : confirmAction === "back"
                  ? "驳回后流程将回退到目标节点。"
                  : "拒绝后流程将被终止。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {confirmAction === "back" && backConfig?.backType === "choose" && (
              <>
                <label className="text-sm text-muted-foreground">
                  驳回目标节点
                </label>
                <Select
                  value={targetNodeId}
                  onValueChange={setTargetNodeId}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择要驳回到的节点" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {backTargets.map((n) => (
                      <SelectItem key={n.nodeId} value={n.nodeId ?? ""}>
                        {n.nodeName ?? n.nodeId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            <label className="text-sm text-muted-foreground">
              审批意见（可空）
            </label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="填写审批意见…"
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <Button
              variant={confirmMeta?.variant ?? "default"}
              disabled={submitting}
              onClick={submit}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              确认{confirmMeta?.label ?? ""}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}

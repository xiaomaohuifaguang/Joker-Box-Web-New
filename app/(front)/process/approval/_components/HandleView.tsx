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
  NextTaskCandidatePicker,
  missingChooseNodes,
} from "../../application/_components/NextTaskCandidatePicker";
import { ProcessWorkHeader } from "../../application/_components/ProcessWorkHeader";
import {
  PROCESS_BUTTON_ACTIONS,
  type ProcessInstance,
} from "@/types";

// 处理任务视图（待办进入）：可编辑表单 + 始终引入联动（填写态，无「按联动显示」开关）。
// 审批操作（pass 通过 / reject 拒绝 / back 驳回）点按钮弹确认框（可填审批意见），确认后调对应接口。
// actionLabels：按动作覆盖按钮文案（如申请中心待处理把 pass 显示为「提交」），缺省用 PROCESS_BUTTON_ACTIONS。
export function HandleView({
  instanceId,
  taskId,
  onBack,
  onDone,
  actionLabels,
}: {
  instanceId: number;
  taskId?: string;
  onBack: () => void;
  onDone: () => void;
  actionLabels?: Partial<Record<"pass" | "reject" | "back", string>>;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 下一用户任务候选人选择（7/8/9）：nodeId -> 选中人员 id 集合。
  const [choose, setChoose] = useState<Record<string, number[]>>({});
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
    setChoose({});
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

  const showForm = hasProcessForm(detail?.taskForm);
  // 可用审批按钮（后端 buttonActions 控制）；未知动作不渲染。
  const actions = (detail?.buttonActions ?? []).filter(
    (a) => PROCESS_BUTTON_ACTIONS[a] != null,
  );
  // 按钮文案：优先 actionLabels 覆盖，缺省取 PROCESS_BUTTON_ACTIONS。
  const labelOf = (a: "pass" | "reject" | "back") =>
    actionLabels?.[a] ?? PROCESS_BUTTON_ACTIONS[a].label;
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
    // 通过时校验 7/8/9 候选人已选（驳回/拒绝不校验）。
    if (confirmAction === "pass") {
      const missing = missingChooseNodes(detail?.nextUserTaskInfos, choose);
      if (missing.length > 0) {
        toast.error(`请为以下节点选择处理人：${missing.join("、")}`);
        return;
      }
    }
    setSubmitting(true);
    const payload = {
      processInstanceId: instanceId,
      taskId,
      remark: remark.trim() || undefined,
      ...(globalFormData ? { globalFormData } : {}),
      ...(confirmAction === "pass" && Object.keys(choose).length > 0
        ? { nodeCandidateUsersChoose: choose }
        : {}),
      ...(confirmAction === "back" && backConfig?.backType === "choose"
        ? { targetNodeId }
        : {}),
    };
    const actionLabel = labelOf(confirmAction);
    try {
      if (confirmAction === "pass") await passProcessTask(payload);
      else if (confirmAction === "reject") await rejectProcessTask(payload);
      else await backProcessTask(payload);
      toast.success(`已${actionLabel}`);
      setConfirmAction(null);
      onDone();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : `${actionLabel}失败`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const confirmMeta =
    confirmAction != null ? PROCESS_BUTTON_ACTIONS[confirmAction] : null;
  const confirmLabel = confirmAction != null ? labelOf(confirmAction) : null;

  return (
    <Container className="py-8 md:py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <header className="mb-6">
        {loading ? (
          <Skeleton className="h-16 w-72" />
        ) : (
          <ProcessWorkHeader
            code={detail?.code}
            title={detail?.title}
            subtitle={`${detail?.processDefinitionName ?? ""}${
              detail?.processDefinitionVersion
                ? ` · v${detail.processDefinitionVersion}`
                : ""
            }`}
            processStatus={detail?.processStatus}
          />
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
          <NextTaskCandidatePicker
            infos={detail?.nextUserTaskInfos}
            value={choose}
            disabled={submitting}
            onChange={(nodeId, ids) => setChoose((s) => ({ ...s, [nodeId]: ids }))}
          />
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
                    {labelOf(a as "pass" | "reject" | "back")}
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
            <AlertDialogTitle>确认{confirmLabel ?? ""}？</AlertDialogTitle>
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
              确认{confirmLabel ?? ""}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}

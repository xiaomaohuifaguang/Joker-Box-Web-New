"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  claimProcessTask,
  getProcessInstanceInfo,
} from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Container } from "@/components/Container";
import type { ProcessInstance } from "@/types";
import { ProcessWorkHeader } from "./ProcessWorkHeader";
import {
  hasProcessForm,
  seedProcessFormValues,
  ProcessFormFields,
} from "./ProcessForm";

// 查看实例详情视图：只读展示（不含创建人，第一版）。审批中心处理/认领进入时带 taskId（info 需回传）。
// showClaim=true（待认领进入）时，底部提供「确认认领」按钮。
export function DetailView({
  instanceId,
  taskId,
  onBack,
  showClaim,
  onClaimed,
}: {
  instanceId: number;
  taskId?: string;
  onBack: () => void;
  showClaim?: boolean;
  onClaimed?: () => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  // 查看态默认不引入联动规则（全量静态展示已存数据）；切换后严格按联动（该隐就隐），但始终只读。
  const [useLinkage, setUseLinkage] = useState(false);

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
        if (!cancelled) setDetail(data);
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

  async function handleClaim() {
    if (taskId == null || claiming) return;
    setClaiming(true);
    try {
      await claimProcessTask({ processInstanceId: instanceId, taskId });
      toast.success("认领成功");
      onClaimed?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "认领失败");
    } finally {
      setClaiming(false);
    }
  }

  const showForm = hasProcessForm(detail?.taskForm);
  const formValues = seedProcessFormValues(detail?.taskForm);
  // 仅当表单定义了联动规则时才提供切换（否则切换无意义）。
  const hasLinkage =
    (detail?.taskForm?.globalForm?.linkageRules?.length ?? 0) > 0;

  // 编号/标题/流程/版本/状态已进工单头；详情区只留时间线。
  const rows: { label: string; value: React.ReactNode }[] = detail
    ? [
        { label: "创建时间", value: detail.createTime || "-" },
        { label: "更新时间", value: detail.updateTime || "-" },
      ]
    : [];

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
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : detail == null ? (
        <p className="py-6 text-sm text-muted-foreground">加载失败</p>
      ) : (
        <>
          <dl className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-3 text-sm">
                <dt className="w-20 shrink-0 text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 flex-1 break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
          {showForm && detail?.taskForm && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-medium text-muted-foreground">表单</h2>
                {hasLinkage && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={useLinkage}
                      onCheckedChange={setUseLinkage}
                      aria-label="按联动规则显示"
                    />
                    按联动规则显示
                  </label>
                )}
              </div>
              <ProcessFormFields
                form={detail.taskForm}
                readOnly
                linkage={useLinkage}
                values={formValues}
                errors={{}}
                onChange={() => {}}
              />
            </div>
          )}
          {showClaim && (
            <div className="mt-8">
              <Button disabled={claiming} onClick={handleClaim}>
                {claiming && <Loader2 className="h-4 w-4 animate-spin" />}
                确认认领
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  );
}

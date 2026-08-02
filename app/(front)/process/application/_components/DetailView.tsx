"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getProcessInstanceInfo } from "@/lib/api/process";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Container } from "@/components/Container";
import {
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstance,
} from "@/types";
import {
  hasProcessForm,
  seedProcessFormValues,
  ProcessFormFields,
} from "./ProcessForm";

// 查看实例详情视图：只读展示（不含创建人，第一版）。
export function DetailView({
  instanceId,
  onBack,
}: {
  instanceId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);
  // 查看态默认不引入联动规则（全量静态展示已存数据）；切换后严格按联动（该隐就隐），但始终只读。
  const [useLinkage, setUseLinkage] = useState(false);

  const [prevId, setPrevId] = useState(instanceId);
  if (prevId !== instanceId) {
    setPrevId(instanceId);
    setDetail(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    getProcessInstanceInfo(instanceId)
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
  }, [instanceId]);

  const st =
    PROCESS_INSTANCE_STATUS[detail?.processStatus ?? ""] ??
    PROCESS_INSTANCE_STATUS_FALLBACK;

  const showForm = hasProcessForm(detail?.taskForm);
  const formValues = seedProcessFormValues(detail?.taskForm);
  // 仅当表单定义了联动规则时才提供切换（否则切换无意义）。
  const hasLinkage =
    (detail?.taskForm?.globalForm?.linkageRules?.length ?? 0) > 0;

  const rows: { label: string; value: React.ReactNode }[] = detail
    ? [
        { label: "编号", value: detail.code || "-" },
        { label: "标题", value: detail.title || "-" },
        { label: "流程", value: detail.processDefinitionName || "-" },
        { label: "版本", value: detail.processDefinitionVersion || "-" },
        { label: "状态", value: <Badge variant={st.variant}>{st.label}</Badge> },
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
        <h1 className="font-display text-2xl font-semibold">流程详情</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail?.processDefinitionName ?? ""}
          {detail?.processDefinitionVersion ? ` · v${detail.processDefinitionVersion}` : ""}
        </p>
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
        </>
      )}
    </Container>
  );
}

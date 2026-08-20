"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/Container";
import { processTypeName } from "@/lib/process-types";
import type { ApprovalInstanceType } from "@/types";
import { ApprovalListPanel } from "./ApprovalListPanel";
import { HandleView } from "./HandleView";
import { DetailView } from "../../application/_components/DetailView";

// 视图状态：列表 / 详情（query 切换，对齐 ApplicationInner）。
// detail.kind：handle=待办处理（可编辑表单+联动）；claim=待认领（只读+确认认领）；view=已办查看（只读）。
export type View =
  | { name: "list" }
  | {
      name: "detail";
      kind: "handle" | "claim" | "view";
      instanceId: number;
      taskId?: string;
    };

// 从 URL query 解析视图（?view=instId[&taskId=n][&kind=handle|claim] / 无参=列表）。
function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  if (view) {
    const taskId = p.get("taskId") ?? undefined;
    const k = p.get("kind");
    const kind = k === "handle" || k === "claim" ? k : "view";
    return { name: "detail", kind, instanceId: Number(view), taskId };
  }
  return { name: "list" };
}

// 基础路径：通用 /process/approval；分类 /process/approval/{type}。
function basePath(processType?: string): string {
  return processType ? `/process/approval/${processType}` : "/process/approval";
}

function viewToUrl(v: View, processType?: string): string {
  const base = basePath(processType);
  if (v.name === "detail") {
    let url = `${base}?view=${v.instanceId}`;
    if (v.taskId != null) url += `&taskId=${v.taskId}`;
    if (v.kind !== "view") url += `&kind=${v.kind}`;
    return url;
  }
  return base;
}

// 审批中心视图编排：list / detail 两视图切换；detail 按 kind 分处理/认领/查看。
// 权威视图 = 响应式 URL（useSearchParams）；内部 go() 用 override 立即生效。同 ApplicationInner。
// processType：分类（/process/approval/oa -> "oa"）；通用页不传（undefined）。
export function ApprovalInner({ processType }: { processType?: string }) {
  const searchParams = useSearchParams();
  const urlStr = searchParams.toString();
  const urlView: View = parseView(urlStr);
  // 内部 go() 跳转的覆盖层：pushState 后 React 不重渲染，靠它立即改视图。
  const [override, setOverride] = useState<View | null>(null);

  // 响应式 URL 变化（外部 <Link> 软导航 / 前进后退）-> 清覆盖层，回到 urlView。
  // go() 的原生 pushState 不经 Next 路由，不触发 useSearchParams，不会误清 override。
  const [prevUrl, setPrevUrl] = useState(urlStr);
  if (prevUrl !== urlStr) {
    setPrevUrl(urlStr);
    setOverride(null);
  }
  const view = override ?? urlView;

  const [activeTab, setActiveTab] = useState<ApprovalInstanceType>("4");
  const [refreshKey, setRefreshKey] = useState(0);

  // 浏览器前进/后退：popstate 直接用 window.location 重算（useSearchParams 在静态导出下可能滞后）。
  useEffect(() => {
    const onPop = () => setOverride(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback(
    (v: View) => {
      window.history.pushState(null, "", viewToUrl(v, processType));
      setOverride(v);
    },
    [processType],
  );

  // 认领/处理成功：回列表并刷新。
  const handleDone = useCallback(() => {
    setRefreshKey((k) => k + 1);
    go({ name: "list" });
  }, [go]);

  if (view.name === "detail") {
    if (view.kind === "handle") {
      return (
        <HandleView
          instanceId={view.instanceId}
          taskId={view.taskId}
          onBack={() => go({ name: "list" })}
          onDone={handleDone}
        />
      );
    }
    return (
      <DetailView
        instanceId={view.instanceId}
        taskId={view.taskId}
        showClaim={view.kind === "claim"}
        onClaimed={handleDone}
        onBack={() => go({ name: "list" })}
      />
    );
  }

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">
          {processTypeName(processType)}审批中心
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          处理待办、待认领与已办的审批任务。
        </p>
      </header>

      <ApprovalListPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        refreshKey={refreshKey}
        processCategory={processType}
        onView={(id) => go({ name: "detail", kind: "view", instanceId: id })}
        onOpenTask={(instanceId, taskId, claim) =>
          go({
            name: "detail",
            kind: claim ? "claim" : "handle",
            instanceId,
            taskId,
          })
        }
      />
    </Container>
  );
}

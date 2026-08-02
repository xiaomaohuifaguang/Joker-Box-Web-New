"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/Container";
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

function viewToUrl(v: View): string {
  if (v.name === "detail") {
    let url = `/process/approval?view=${v.instanceId}`;
    if (v.taskId != null) url += `&taskId=${v.taskId}`;
    if (v.kind !== "view") url += `&kind=${v.kind}`;
    return url;
  }
  return "/process/approval";
}

// 审批中心视图编排：list / detail 两视图切换；detail 按 kind 分处理/认领/查看。
// state 为主（渲染可靠），URL 用原生 pushState 同步（可分享/刷新/前进后退还原）。
export function ApprovalInner() {
  const [view, setView] = useState<View>(() =>
    typeof window === "undefined" ? { name: "list" } : parseView(window.location.search),
  );
  const [activeTab, setActiveTab] = useState<ApprovalInstanceType>("4");
  const [refreshKey, setRefreshKey] = useState(0);

  // 前进/后退 -> 同步回 state。
  useEffect(() => {
    const onPop = () => setView(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((v: View) => {
    window.history.pushState(null, "", viewToUrl(v));
    setView(v);
  }, []);

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
        <h1 className="font-display text-2xl font-semibold">审批中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          处理待办、待认领与已办的审批任务。
        </p>
      </header>

      <ApprovalListPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        refreshKey={refreshKey}
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

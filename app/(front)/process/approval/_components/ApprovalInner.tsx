"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/Container";
import type { ApprovalInstanceType } from "@/types";
import { ApprovalListPanel } from "./ApprovalListPanel";
import { DetailView } from "../../application/_components/DetailView";

// 视图状态：列表 / 查看（query 切换，对齐 ApplicationInner）。
export type View = { name: "list" } | { name: "detail"; instanceId: number };

// 从 URL query 解析视图（?view=instId / 无参=列表）。
function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  if (view) return { name: "detail", instanceId: Number(view) };
  return { name: "list" };
}

function viewToUrl(v: View): string {
  if (v.name === "detail") return `/process/approval?view=${v.instanceId}`;
  return "/process/approval";
}

// 审批中心视图编排：list / detail 两视图切换。
// state 为主（渲染可靠），URL 用原生 pushState 同步（可分享/刷新/前进后退还原）。
export function ApprovalInner() {
  const [view, setView] = useState<View>(() =>
    typeof window === "undefined" ? { name: "list" } : parseView(window.location.search),
  );
  const [activeTab, setActiveTab] = useState<ApprovalInstanceType>("4");

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

  if (view.name === "detail") {
    return (
      <DetailView
        instanceId={view.instanceId}
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
        onView={(id) => go({ name: "detail", instanceId: id })}
      />
    </Container>
  );
}

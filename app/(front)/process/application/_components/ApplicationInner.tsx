"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/Container";
import type { ProcessInstanceType } from "@/types";
import { InstanceListPanel } from "./InstanceListPanel";
import { StartProcessSection } from "./StartProcessSection";
import { DetailView } from "./DetailView";
import { EditView } from "./EditView";
import { StartView } from "./StartView";

// 视图状态：列表 / 发起 / 查看 / 编辑（query 切换，对齐 ganDaShi ForumInner）。
export type View =
  | { name: "list" }
  | { name: "start"; definitionId: number }
  | { name: "detail"; instanceId: number }
  | { name: "edit"; instanceId: number };

// 从 URL query 解析视图（?start=defId / ?view=instId / ?edit=instId / 无参=列表）。
function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const start = p.get("start");
  if (start) return { name: "start", definitionId: Number(start) };
  const view = p.get("view");
  if (view) return { name: "detail", instanceId: Number(view) };
  const edit = p.get("edit");
  if (edit) return { name: "edit", instanceId: Number(edit) };
  return { name: "list" };
}

// 基础路径：通用 /process/application；分类 /process/application/{type}。
function basePath(processType?: string): string {
  return processType
    ? `/process/application/${processType}`
    : "/process/application";
}

function viewToUrl(v: View, processType?: string): string {
  const base = basePath(processType);
  if (v.name === "start") return `${base}?start=${v.definitionId}`;
  if (v.name === "detail") return `${base}?view=${v.instanceId}`;
  if (v.name === "edit") return `${base}?edit=${v.instanceId}`;
  return base;
}

// 申请中心视图编排：list / start / detail / edit 四视图切换。
// state 为主（渲染可靠），URL 用原生 pushState 同步（可分享/刷新/前进后退还原）。
// 不用 router.push：同 path 仅改 query 时静态导出的软导航不可靠。
// processType：分类（/process/application/oa -> "oa"）；通用页不传（undefined）。
export function ApplicationInner({ processType }: { processType?: string }) {
  const searchParams = useSearchParams();
  // 权威视图 = 响应式 URL（useSearchParams 由 Next 客户端路由驱动，外部 <Link>/前进后退必更新）。
  // 解决：兄弟页（申请<->审批）<Link> 软导航不重建组件，纯 useState(快照) 不重算残留详情态。
  const urlStr = searchParams.toString();
  const urlView: View = parseView(urlStr);
  // 内部 go() 跳转的覆盖层：pushState 后 React 不重渲染，靠它立即改视图。
  const [override, setOverride] = useState<View | null>(null);

  // 响应式 URL 变化（外部软导航 / 前进后退）-> 清覆盖层，回到 urlView。
  // 注意：go() 的原生 pushState 不经 Next 路由，不触发 useSearchParams，不会误清 override。
  const [prevUrl, setPrevUrl] = useState(urlStr);
  if (prevUrl !== urlStr) {
    setPrevUrl(urlStr);
    setOverride(null);
  }
  const view = override ?? urlView;

  const [activeTab, setActiveTab] = useState<ProcessInstanceType>("1");
  const [refreshKey, setRefreshKey] = useState(0);

  // 确认 processType 生效（后续接 queryPage 传参 prcessType）。
  useEffect(() => {
    console.log("[process/application] processType =", processType ?? "(通用)");
  }, [processType]);

  const go = useCallback(
    (v: View) => {
      window.history.pushState(null, "", viewToUrl(v, processType));
      setOverride(v);
    },
    [processType],
  );

  // 浏览器前进/后退：popstate 直接用 window.location 重算（useSearchParams 在静态导出下可能滞后）。
  useEffect(() => {
    const onPop = () => setOverride(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 发起/编辑/存草稿成功：回列表、切对应 tab、刷新。
  const handleDone = useCallback(
    (kind: "start" | "draft") => {
      setRefreshKey((k) => k + 1);
      setActiveTab(kind === "start" ? "1" : "0");
      go({ name: "list" });
    },
    [go],
  );

  if (view.name === "start") {
    return (
      <StartView
        definitionId={view.definitionId}
        onBack={() => go({ name: "list" })}
        onDone={handleDone}
      />
    );
  }
  if (view.name === "detail") {
    return (
      <DetailView
        instanceId={view.instanceId}
        onBack={() => go({ name: "list" })}
      />
    );
  }
  if (view.name === "edit") {
    return (
      <EditView
        instanceId={view.instanceId}
        onBack={() => go({ name: "list" })}
        onDone={handleDone}
      />
    );
  }

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">申请中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择流程发起申请，或查看我发起的流程。
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">发起流程</h2>
        <StartProcessSection onStart={(id) => go({ name: "start", definitionId: id })} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">我的流程</h2>
        <InstanceListPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          refreshKey={refreshKey}
          onView={(id) => go({ name: "detail", instanceId: id })}
          onEdit={(id) => go({ name: "edit", instanceId: id })}
        />
      </section>
    </Container>
  );
}

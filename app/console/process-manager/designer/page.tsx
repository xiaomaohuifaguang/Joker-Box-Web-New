"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessListPanel } from "./_components/ProcessListPanel";
import { ProcessDesigner } from "./_components/ProcessDesigner";

// 流程设计：列表 / 设计器 / 只读查看三视图。?design=id 编辑 / ?design=new 新增 / ?view=id 只读 / 无参列表。
// state 驱动 + pushState 同步 URL（同 dynamicForm-manager：静态导出下同 path 软导航不可靠）。
export default function ProcessDesignerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Inner />
    </Suspense>
  );
}

type View = { name: "list" } | { name: "design"; id: number | null } | { name: "view"; id: number };

function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const v = p.get("view");
  if (v != null) return { name: "view", id: Number(v) };
  const d = p.get("design");
  if (d == null) return { name: "list" };
  return { name: "design", id: d === "new" ? null : Number(d) };
}

function Inner() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>(() => parseView(searchParams.toString()));

  useEffect(() => {
    const onPop = () => setView(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((v: View) => {
    const url =
      v.name === "design"
        ? `/console/process-manager/designer?design=${v.id ?? "new"}`
        : v.name === "view"
          ? `/console/process-manager/designer?view=${v.id}`
          : "/console/process-manager/designer";
    window.history.pushState(null, "", url);
    setView(v);
  }, []);

  if (view.name === "design") {
    return (
      <ProcessDesigner
        id={view.id}
        onBack={() => go({ name: "list" })}
        onSaved={() => go({ name: "list" })}
      />
    );
  }
  if (view.name === "view") {
    return <ProcessDesigner id={view.id} readOnly onBack={() => go({ name: "list" })} />;
  }
  return (
    <ProcessListPanel
      onDesign={(id) => go({ name: "design", id })}
      onView={(id) => go({ name: "view", id })}
    />
  );
}

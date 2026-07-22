"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { FormListPanel } from "./_components/FormListPanel";
import { FormDesigner } from "./_components/FormDesigner";

// 动态表单管理：列表 / 设计器两视图。?design=id 编辑 / ?design=new 新增 / 无参列表。
// state 驱动 + pushState 同步 URL（同 ganDaShi ForumInner：静态导出下同 path 软导航不可靠）。
export default function DynamicFormManagerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Inner />
    </Suspense>
  );
}

type View = { name: "list" } | { name: "design"; id: string | null };

function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const d = p.get("design");
  if (d == null) return { name: "list" };
  return { name: "design", id: d === "new" ? null : d };
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
        ? `/console/form/dynamicForm-manager?design=${v.id ?? "new"}`
        : "/console/form/dynamicForm-manager";
    window.history.pushState(null, "", url);
    setView(v);
  }, []);

  if (view.name === "design") {
    return (
      <FormDesigner
        id={view.id}
        onBack={() => go({ name: "list" })}
        onSaved={() => go({ name: "list" })}
      />
    );
  }
  return <FormListPanel onDesign={(id) => go({ name: "design", id })} />;
}

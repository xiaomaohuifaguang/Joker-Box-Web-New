"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeTableListPanel } from "./_components/CodeTableListPanel";
import { CodeItemsView } from "./_components/CodeItemsView";

// 码表管理：列表视图（无 tableId）<-> 项视图（?tableId=xxx）。
// useSearchParams 需 Suspense 包裹（静态导出）。
function CodeTablePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId") ?? "";

  if (tableId) {
    return (
      <CodeItemsView
        tableId={tableId}
        onBack={() => router.push("/console/system/code-table")}
      />
    );
  }
  return (
    <CodeTableListPanel
      onDetail={(table) =>
        router.push(`/console/system/code-table?tableId=${table.id}`)
      }
    />
  );
}

export default function CodeTablePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">加载中…</div>
      }
    >
      <CodeTablePageInner />
    </Suspense>
  );
}

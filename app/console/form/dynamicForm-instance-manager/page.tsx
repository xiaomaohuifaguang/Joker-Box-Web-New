"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InstanceListPanel } from "./_components/InstanceListPanel";
import { InstanceDetailView } from "./_components/InstanceDetailView";

// 表单实例管理：列表视图（无 instanceId）<-> 详情视图（?instanceId=xxx，只读预览）。
// useSearchParams 需 Suspense 包裹（静态导出）。
function InstancePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instanceId = searchParams.get("instanceId") ?? "";

  if (instanceId) {
    return (
      <InstanceDetailView
        instanceId={instanceId}
        onBack={() => router.push("/console/form/dynamicForm-instance-manager")}
      />
    );
  }
  return (
    <InstanceListPanel
      onView={(inst) =>
        router.push(
          `/console/form/dynamicForm-instance-manager?instanceId=${inst.id}`,
        )
      }
    />
  );
}

export default function DynamicFormInstanceManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">加载中…</div>
      }
    >
      <InstancePageInner />
    </Suspense>
  );
}

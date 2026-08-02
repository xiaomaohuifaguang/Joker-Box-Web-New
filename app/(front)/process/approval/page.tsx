import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalInner } from "./_components/ApprovalInner";

// 审批中心：视图编排（list/detail），见 ApprovalInner。
// useSearchParams 需 Suspense（静态导出）。
export default function ProcessApprovalPage() {
  return (
    <RequirePermission>
      <Suspense
        fallback={
          <div className="px-6 py-12">
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <ApprovalInner />
      </Suspense>
    </RequirePermission>
  );
}

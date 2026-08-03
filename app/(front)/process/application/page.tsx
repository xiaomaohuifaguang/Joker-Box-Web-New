import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationInner } from "./_components/ApplicationInner";

// 申请中心：视图编排（list/start/detail/edit），见 ApplicationInner。
// useSearchParams 需 Suspense（静态导出）。
export default function ProcessApplicationPage() {
  return (
    <RequirePermission>
      <Suspense
        fallback={
          <div className="px-6 py-12">
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <ApplicationInner />
      </Suspense>
    </RequirePermission>
  );
}

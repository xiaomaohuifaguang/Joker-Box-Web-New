import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { ForumInner } from "./_components/ForumInner";

// 干大事论坛：列表 / 详情(?thread) / 发帖(?new) 三视图。
// useSearchParams 需 Suspense（静态导出）。整站 RequirePermission 守卫。
export default function GanDaShiPage() {
  return (
    <RequirePermission>
      <Suspense
        fallback={
          <div className="px-6 py-12">
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <ForumInner />
      </Suspense>
    </RequirePermission>
  );
}

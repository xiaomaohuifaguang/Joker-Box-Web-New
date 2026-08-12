import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalInner } from "../_components/ApprovalInner";

// 分类审批中心：/process/approval/{type}（如 /process/approval/oa）。
// 静态导出下 build 时用 generateStaticParams 枚举 type（新 type 需重新 build 才有 HTML）。
export function generateStaticParams(): { type: string }[] {
  return [{ type: "oa" }];
}

export default async function ProcessApprovalTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  return (
    <RequirePermission>
      <Suspense
        fallback={
          <div className="px-6 py-12">
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <ApprovalInner processType={type} />
      </Suspense>
    </RequirePermission>
  );
}

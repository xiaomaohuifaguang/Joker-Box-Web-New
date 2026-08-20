import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { PROCESS_TYPES, DEFAULT_PROCESS_TYPE } from "@/lib/process-types";
import { ApprovalInner } from "../_components/ApprovalInner";

// 分类审批中心：/process/approval/{type}（如 /process/approval/oa）。
// 静态导出下 build 时用 generateStaticParams 枚举 type（新 type 需重新 build 才有 HTML）。
// type 来源于 PROCESS_TYPES 注册表，排除默认分类 default——默认分类就是通用页 /process/approval（路由不带 default）。
export function generateStaticParams(): { type: string }[] {
  return PROCESS_TYPES.filter((t) => t.type !== DEFAULT_PROCESS_TYPE).map((t) => ({
    type: t.type,
  }));
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

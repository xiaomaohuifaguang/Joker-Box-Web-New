import { Suspense } from "react";
import { RequirePermission } from "@/components/RequirePermission";
import { Skeleton } from "@/components/ui/skeleton";
import { PROCESS_TYPES } from "@/lib/process-types";
import { ApplicationInner } from "../_components/ApplicationInner";

// 分类申请中心：/process/application/{type}（如 /process/application/oa）。
// 静态导出下 build 时用 generateStaticParams 枚举 type（新 type 需重新 build 才有 HTML）。
// type 来源于 PROCESS_TYPES 注册表（含默认分类 default）。
export function generateStaticParams(): { type: string }[] {
  return PROCESS_TYPES.map((t) => ({ type: t.type }));
}

export default async function ProcessApplicationTypePage({
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
        <ApplicationInner processType={type} />
      </Suspense>
    </RequirePermission>
  );
}

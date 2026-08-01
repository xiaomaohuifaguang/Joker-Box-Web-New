import { RequirePermission } from "@/components/RequirePermission";
import { ApplicationInner } from "./_components/ApplicationInner";

// 申请中心：视图编排（list/start/detail/edit），见 ApplicationInner。
export default function ProcessApplicationPage() {
  return (
    <RequirePermission>
      <ApplicationInner />
    </RequirePermission>
  );
}

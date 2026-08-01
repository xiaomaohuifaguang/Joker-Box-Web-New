import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function ProcessApprovalPage() {
  return (
    <RequirePermission>
      <ComingSoon title="审批中心" />
    </RequirePermission>
  );
}

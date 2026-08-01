import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function ProcessApplicationPage() {
  return (
    <RequirePermission>
      <ComingSoon title="申请中心" />
    </RequirePermission>
  );
}

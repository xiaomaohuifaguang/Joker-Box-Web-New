import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function GanDaShiPage() {
  return (
    <RequirePermission>
      <ComingSoon title="干大事论坛" />
    </RequirePermission>
  );
}

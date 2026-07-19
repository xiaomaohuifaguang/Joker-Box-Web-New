import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function ProcessPage() {
  return (
    <RequirePermission>
      <ComingSoon title="就酱审" />
    </RequirePermission>
  );
}

import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function CodeMakerPage() {
  return (
    <RequirePermission>
      <ComingSoon title="代码生成器" />
    </RequirePermission>
  );
}

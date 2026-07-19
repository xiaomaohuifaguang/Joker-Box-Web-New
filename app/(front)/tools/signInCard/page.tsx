import { RequirePermission } from "@/components/RequirePermission";
import { ComingSoon } from "@/components/ComingSoon";

export default function SignInCardPage() {
  return (
    <RequirePermission>
      <ComingSoon title="签到卡" />
    </RequirePermission>
  );
}

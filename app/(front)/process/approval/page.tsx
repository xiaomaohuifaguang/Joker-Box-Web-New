import { RequirePermission } from "@/components/RequirePermission";
import { ApprovalInner } from "./_components/ApprovalInner";

export default function ProcessApprovalPage() {
  return (
    <RequirePermission>
      <ApprovalInner />
    </RequirePermission>
  );
}

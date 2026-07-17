import { RequirePermission } from "@/components/RequirePermission";

export default function WebsitePage() {
  return (
    <RequirePermission>
      <div className="p-8">
        <h1 className="text-xl font-semibold">收藏网站</h1>
      </div>
    </RequirePermission>
  );
}

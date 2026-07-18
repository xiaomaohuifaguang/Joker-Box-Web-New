import { Loader2 } from "lucide-react";

// 全局路由加载兜底（/login、/register、/test 等无外壳路由）。
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

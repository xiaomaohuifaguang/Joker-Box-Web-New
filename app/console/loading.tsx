import { Loader2 } from "lucide-react";

// 后台路由加载态（在 console 外壳内渲染，侧栏 + 顶栏保留）。
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

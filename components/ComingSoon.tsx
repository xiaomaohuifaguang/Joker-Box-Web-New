import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

// 占位页提示：功能未上线时用。未实现的菜单路由建一个 page.tsx 直接渲染 <ComingSoon />。
// 纯展示（Server Component），在前台/后台任意页面 main 区居中显示。
export function ComingSoon({
  title = "敬请期待",
  description,
}: {
  title?: string;
  description?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-surface text-muted-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? "这个功能还在路上，稍后回来看看。"}
      </p>
    </div>
  );
}

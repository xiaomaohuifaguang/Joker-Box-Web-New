import Link from "next/link";
import { Button } from "@/components/ui/button";

// 错误页内容（404/403 复用）：大号状态码 + 标题 + 说明 + 回首页。
export function ErrorState({
  code,
  title,
  message,
}: {
  code: string;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="text-6xl font-semibold tabular-nums text-brand">{code}</div>
      <h1 className="text-page-title mt-4 font-semibold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-6">
        <Link href="/">回首页</Link>
      </Button>
    </div>
  );
}

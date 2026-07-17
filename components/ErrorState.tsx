import Link from "next/link";

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
      <div className="font-display text-7xl font-semibold text-brand">
        {code}
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-felt px-4 py-2 text-sm text-background transition-opacity hover:opacity-90"
      >
        回首页
      </Link>
    </div>
  );
}

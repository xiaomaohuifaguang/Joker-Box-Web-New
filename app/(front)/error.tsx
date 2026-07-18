"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// 前台错误态（在 (front) 外壳内渲染，Header/Footer 保留）。
export default function FrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-semibold">出错了</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        页面加载时出了点问题，请重试。
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>重试</Button>
        <Button asChild variant="outline">
          <Link href="/">回首页</Link>
        </Button>
      </div>
    </div>
  );
}

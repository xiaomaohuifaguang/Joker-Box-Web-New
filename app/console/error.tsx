"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// 后台错误态（在 console 外壳内渲染，侧栏 + 顶栏保留）。
export default function ConsoleError({
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
        后台加载时出了点问题，请重试。
      </p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}

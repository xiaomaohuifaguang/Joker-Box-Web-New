"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkbenchTodo } from "@/hooks/useWorkbenchTodo";

// 工作台待办卡：只在用户有审批中心权限时渲染，失败只影响这张卡。
export function TodoPanel() {
  const { state, error, retry } = useWorkbenchTodo(true);
  const count = state ? state.pending + state.claimable : 0;

  return (
    <section className="rounded-lg border bg-card" aria-labelledby="workbench-todo">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 id="workbench-todo" className="text-section font-semibold">
          我的待办
          {count > 0 && <span className="ml-2 text-brand tabular-nums">{count}</span>}
        </h2>
        <Link href="/process/approval" className="text-caption text-muted-foreground hover:text-foreground">
          查看全部
        </Link>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">待办加载失败，请重试。</p>
          <Button variant="outline" size="sm" onClick={retry}>
            重新加载
          </Button>
        </div>
      ) : !state ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : state.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          <p className="text-sm font-medium">没有待处理的审批</p>
        </div>
      ) : (
        <ul className="divide-y">
          {state.items.map(({ key, record, kind, href }) => (
            <li key={key}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {record.title || record.processDefinitionName || record.code || "未命名流程"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[record.taskName, record.createByName].filter(Boolean).join("，")}
                  </span>
                </span>
                <Badge variant={kind === "claim" ? "info" : "warning"} className="shrink-0">
                  {kind === "claim" ? "待认领" : "待处理"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { queryProcessInstancePage } from "@/lib/api/process";
import { DEFAULT_PROCESS_TYPE, PROCESS_TYPES } from "@/lib/process-types";
import type { ProcessInstance } from "@/types";

export interface WorkbenchTodoItem {
  key: string;
  record: ProcessInstance;
  kind: "handle" | "claim";
  href: string;
}

interface TodoState {
  items: WorkbenchTodoItem[];
  pending: number;
  claimable: number;
}

const PREVIEW = 5;

// 与审批中心 viewToUrl 同一套 URL：/process/approval[/type]?view=&taskId=&kind=
function todoHref(type: string, kind: "handle" | "claim", record: ProcessInstance): string {
  const base = type === DEFAULT_PROCESS_TYPE ? "/process/approval" : `/process/approval/${type}`;
  const task = record.taskId != null ? `&taskId=${record.taskId}` : "";
  return `${base}?view=${record.id}${task}&kind=${kind}`;
}

// 工作台待办：按每个流程分类分别查询待办(2)、待认领(3)后汇总（接口按分类隔离，分类页同样如此）。
export function useWorkbenchTodo(enabled: boolean) {
  const [state, setState] = useState<TodoState | null>(null);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const queries = PROCESS_TYPES.flatMap(({ type }) =>
      (["handle", "claim"] as const).map(async (kind) => {
        const page = await queryProcessInstancePage({
          type: kind === "handle" ? "2" : "3",
          current: 1,
          size: PREVIEW,
          processCategory: type,
        });
        return { type, kind, page };
      }),
    );
    Promise.all(queries)
      .then((results) => {
        if (!active) return;
        const items = results
          .flatMap(({ type, kind, page }) =>
            (page.records ?? []).map((record) => ({
              key: `${type}-${record.id}-${record.taskId ?? ""}`,
              record,
              kind,
              href: todoHref(type, kind, record),
            })),
          )
          .sort((a, b) => (b.record.updateTime ?? "").localeCompare(a.record.updateTime ?? ""))
          .slice(0, PREVIEW);
        const sum = (kind: "handle" | "claim") =>
          results
            .filter((r) => r.kind === kind)
            .reduce((n, r) => n + (r.page.total ?? 0), 0);
        setState({ items, pending: sum("handle"), claimable: sum("claim") });
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [enabled, refreshKey]);

  const retry = useCallback(() => {
    setError(false);
    setState(null);
    setRefreshKey((k) => k + 1);
  }, []);

  return { state, error, retry };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import type { Edge } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PROCESS_NODE_REGISTRY, type ProcessFlowNode, type ProcessNodeKind } from "./nodes";

// 模拟运行面板：从「开始」沿连线 BFS 走到「结束」，逐步点亮节点并输出执行轨迹（纯前端，不调后端）。
interface Step {
  nodeId: string;
  label: string;
  kind: ProcessNodeKind;
}

interface Trace {
  steps: Step[];
  /** ok=到达结束；no-start=缺开始；dead-end=中断（有向图里到不了结束） */
  status: "ok" | "no-start" | "dead-end";
  message: string;
}

function buildTrace(nodes: ProcessFlowNode[], edges: Edge[]): Trace {
  const start = nodes.find((n) => n.type === "startEvent");
  if (!start) return { steps: [], status: "no-start", message: "缺少「开始」节点" };

  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const steps: Step[] = [];
  const visited = new Set<string>();
  const queue = [start.id];
  let reachedEnd = false;
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    const kind = (node.type as ProcessNodeKind) ?? "serviceTask";
    steps.push({ nodeId: id, label: node.data.label || PROCESS_NODE_REGISTRY[kind].label, kind });
    if (kind === "endEvent") {
      reachedEnd = true;
      continue;
    }
    for (const next of out.get(id) ?? []) if (!visited.has(next)) queue.push(next);
  }

  if (reachedEnd) return { steps, status: "ok", message: `到达「结束」，共 ${steps.length} 个节点` };
  return { steps, status: "dead-end", message: "流程中断：从「开始」走不到「结束」，请检查连线" };
}

export function ProcessRunPanel({
  nodes,
  edges,
  running,
  onStep,
  onFinish,
}: {
  nodes: ProcessFlowNode[];
  edges: Edge[];
  running: boolean;
  /** 每进入一步回调（当前节点 id 数组，用于画布高亮） */
  onStep: (activeIds: string[]) => void;
  onFinish: () => void;
}) {
  const trace = useMemo(() => buildTrace(nodes, edges), [nodes, edges]);
  const [index, setIndex] = useState(0);

  // 运行启动后按节拍推进；结束回调父级收尾。重开时父级用 key 重挂载本组件复位。
  useEffect(() => {
    if (!running) return;
    if (trace.steps.length === 0) {
      onStep([]);
      onFinish();
      return;
    }
    if (index >= trace.steps.length) {
      onFinish();
      return;
    }
    onStep(trace.steps.slice(0, index + 1).map((s) => s.nodeId));
    const t = setTimeout(() => setIndex((i) => i + 1), 450);
    return () => clearTimeout(t);
  }, [running, index, trace, onStep, onFinish]);

  const done = !running;

  return (
    <div className="flex flex-col gap-2">
      {/* 状态行 */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
          done && trace.status === "ok" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          done && trace.status !== "ok" && "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
          !done && "border-primary/40 bg-primary/10 text-primary",
        )}
      >
        {!done ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : trace.status === "ok" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        {!done ? "运行中…" : trace.message}
      </div>

      {/* 执行轨迹 */}
      <ol className="flex flex-col gap-1">
        {trace.steps.map((s, i) => {
          const active = !done && i === index;
          const past = done || i < index;
          const meta = PROCESS_NODE_REGISTRY[s.kind];
          const Icon = meta.icon;
          return (
            <li
              key={`${s.nodeId}-${i}`}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                active && "border-primary/50 bg-primary/10",
                past && !active && "border-border bg-muted/40",
                !past && "border-dashed border-border text-muted-foreground",
              )}
            >
              {past ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", meta.iconChip)}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
              <span className="text-[10px] text-muted-foreground">{meta.label}</span>
            </li>
          );
        })}
      </ol>

      {done && <p className="text-xs text-muted-foreground">运行结束，可点「停止」复位画布。</p>}
    </div>
  );
}

export function StopButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      停止
    </Button>
  );
}

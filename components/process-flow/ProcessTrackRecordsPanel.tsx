"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PROCESS_HANDLE_TYPES,
  type ProcessHandleInfo,
  type RoundRecordVO,
} from "@/types";

// handleType -> 时间轴标记点语义色（全走主题 token，11 套预设 × 明暗自动跟随）。
// 章色即结论色：pass=success / auto_pass=info / reject=error / back=warning；其余中性；
// to_claim/to_do（当前活动任务）=primary——与画布「蓝=当前」同族，spine 上一眼分出「在等的任务」。
const HANDLE_MARKER: Record<string, string> = {
  pass: "bg-success",
  auto_pass: "bg-info",
  reject: "bg-error",
  back: "bg-warning",
  to_claim: "bg-primary",
  to_do: "bg-primary",
};
const MARKER_FALLBACK = "bg-muted-foreground/50";

// 单条处理记录（时间轴条目：章 + 人 首行，mono 时间次行，备注再下）。
// showNode（流程时间线态）：节点名提为首行标题（混排时不靠它分不清记录属于哪个节点），
// 章+人退居第二行；会签栏头部已是节点名，不重复。taskName 空时用 taskDefinitionKey 兜底查节点 label。
// 空字段不渲染占位符：to_claim 无处理人（孤零零一枚章，形态本身即信息）、活动任务无时间。
// 模块级纯函数而非组件——one-component-per-file，也避免 react-hooks/static-components。
function recordItem(
  h: ProcessHandleInfo,
  key: React.Key,
  opts?: { showNode?: boolean; nodeLabelOf?: (taskDefinitionKey: string) => string | undefined },
): ReactNode {
  const t = PROCESS_HANDLE_TYPES[h.handleType ?? ""] ?? {
    label: h.handleType ?? "未知",
    variant: "outline" as const,
  };
  const userName = h.handleUserName || h.handleUser;
  const nodeName =
    h.taskName ||
    (h.taskDefinitionKey != null ? opts?.nodeLabelOf?.(h.taskDefinitionKey) : undefined);
  return (
    <li key={key} className="relative pl-5">
      <span
        aria-hidden
        className={cn(
          "absolute left-[1.5px] top-2 h-2 w-2 rounded-full",
          HANDLE_MARKER[h.handleType ?? ""] ?? MARKER_FALLBACK,
        )}
      />
      {opts?.showNode && nodeName && (
        <div className="truncate text-sm font-medium">{nodeName}</div>
      )}
      <div className={cn("flex items-baseline gap-2", opts?.showNode && nodeName && "mt-0.5")}>
        <Badge variant={t.variant} className="shrink-0 text-xs">
          {t.label}
        </Badge>
        {userName && (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              !(opts?.showNode && nodeName) && "font-medium",
            )}
          >
            {userName}
          </span>
        )}
      </div>
      {h.handleTime && (
        <time className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
          {h.handleTime.slice(0, 19)}
        </time>
      )}
      {h.remark && (
        <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
          {h.remark}
        </p>
      )}
    </li>
  );
}

// spine 竖轴容器（标记点中心与线对齐：线 left-[5px] 中心 5.5px，点 w-2 left-[1.5px] 中心 5.5px）
function spineList(children: ReactNode): ReactNode {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute bottom-2 left-[5px] top-2 w-px bg-border"
      />
      <ul className="flex flex-col gap-4">{children}</ul>
    </div>
  );
}

// 流程追踪·右侧常驻记录面板（双态，图纸「会签栏」语汇：画布管空间路径，面板管时间路径）：
// - 选中节点：该节点的轮次处理记录（rounds = track.nodeRoundRecordInfoList[nodeId]，多轮才分组）。
// - 未选中（点击空白/点 X/打开默认）：流程处理时间线（timeline = track.processHandleInfoList）。
// 两者都是后端已排序、原样渲染；记录含当前活动任务（to_claim 待认领：无处理人无时间 / to_do 待办：有处理人无时间）。
export function ProcessTrackRecordsPanel({
  nodeId,
  nodeLabel,
  nodeKindLabel,
  rounds,
  timeline,
  nodeLabelOf,
  onClose,
  className,
}: {
  /** 选中节点 id（null=流程时间线态） */
  nodeId: string | null;
  /** 节点显示名（从 rawData 节点 data.label 查；空兜底 nodeId） */
  nodeLabel?: string;
  /** 节点类型显示名（PROCESS_NODE_REGISTRY label，如「用户任务」） */
  nodeKindLabel?: string;
  /** 该节点的轮次记录（空=暂无处理记录） */
  rounds?: RoundRecordVO[];
  /** 流程处理时间线（nodeId=null 时显示；条目首行带节点名 taskName） */
  timeline?: ProcessHandleInfo[];
  /** taskDefinitionKey -> 节点 label 兜底查询（timeline 态 taskName 为空时用；来自 rawData 查表） */
  nodeLabelOf?: (taskDefinitionKey: string) => string | undefined;
  onClose?: () => void;
  className?: string;
}) {
  const isNode = nodeId != null;
  const nodeTotal =
    rounds?.reduce((sum, r) => sum + (r.handleInfos?.length ?? 0), 0) ?? 0;
  const multiRound = (rounds?.length ?? 0) > 1;
  const total = isNode ? nodeTotal : (timeline?.length ?? 0);

  return (
    <aside className={className}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium">
            {isNode ? (
              <>
                {nodeLabel || nodeId}
                {nodeKindLabel && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {nodeKindLabel}
                  </span>
                )}
              </>
            ) : (
              "处理时间线"
            )}
          </h3>
          {total > 0 && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {total} 条
            </Badge>
          )}
          {isNode && onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onClose}
              aria-label="返回处理时间线"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isNode ? (
            nodeTotal === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                该节点暂无处理记录
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {rounds!.map((r, i) => (
                  <section key={r.round ?? i}>
                    {multiRound && (
                      // 轮次是会签批次（真序列），「第 N 轮」+ 发丝线分隔
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <span className="shrink-0">第 {r.round ?? i + 1} 轮</span>
                        <span aria-hidden className="h-px flex-1 bg-border" />
                      </h4>
                    )}
                    {spineList((r.handleInfos ?? []).map((h, j) => recordItem(h, j)))}
                  </section>
                ))}
              </div>
            )
          ) : total === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              暂无处理记录
            </p>
          ) : (
            // 流程时间线：全节点混排，后端已按时间排序，不分轮次；条目首行带节点名
            spineList(
              timeline!.map((h, j) =>
                recordItem(h, j, { showNode: true, nodeLabelOf }),
              ),
            )
          )}
        </div>
      </div>
    </aside>
  );
}

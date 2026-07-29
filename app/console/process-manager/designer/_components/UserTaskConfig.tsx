"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CandidateDeptsSelect,
  CandidateRolesSelect,
  CandidateUsersSelect,
} from "./CandidateSelects";
import { selectorInitByIds } from "@/lib/api/user";
import type { Edge } from "@xyflow/react";
import {
  PROCESS_NODE_REGISTRY,
  type ProcessFlowNode,
  type ProcessNodeData,
  type ProcessNodeKind,
} from "./nodes";

// 审批类型（approvalType）。value 为字符串入 node.data。
const APPROVAL_TYPES = [
  { value: "1", label: "会签" },
  { value: "2", label: "或签" },
  { value: "3", label: "随机1人" },
  { value: "4", label: "认领" },
];

// 操作按钮（actionButtons）。value 入 node.data（逗号串），label 展示。
const ACTION_BUTTONS = [
  { value: "pass", label: "通过" },
  { value: "back", label: "驳回" },
  { value: "reject", label: "拒绝" },
];

// 驳回方式（backType，勾选「驳回」后显示）。
const BACK_TYPES = [
  { value: "prev", label: "上一节点" },
  { value: "specific", label: "驳回到指定节点" },
  { value: "choose", label: "用户自选" },
];

// 回退后任务分配策略（backAssigneePolicy，默认 auto）。
const BACK_ASSIGNEE_POLICIES = [
  { value: "auto", label: "智能默认", hint: "有上次办理人则派回，无则按配置重新分配" },
  { value: "last_handler", label: "派给上次办理人", hint: "" },
  { value: "reassign", label: "重新分配", hint: "按节点 candidate 配置" },
];

// 用户任务（userTask）属性配置：approvalType / passRate（仅会签）/ 候选用户/角色/部门。
// 候选值=逗号串入 node.data；展示名走 node.data.__names（运行时映射，保存前剥离）。
export function UserTaskConfig({
  node,
  nodes,
  edges,
  readOnly,
  onChange,
}: {
  node: ProcessFlowNode;
  /** 画布全部节点（驳回节点 backNodeId 枚举用） */
  nodes: ProcessFlowNode[];
  /** 画布全部连线（驳回节点按图反向可达算上游用） */
  edges: Edge[];
  readOnly: boolean;
  onChange: (patch: Partial<ProcessNodeData>) => void;
}) {
  const d = node.data;
  const approvalType = d.approvalType ?? "";
  const passRate = d.passRate ?? "1.00";
  const names = d.__names ?? {};
  const actionButtons = (d.actionButtons ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const backEnabled = actionButtons.includes("back");
  const backType = d.backType ?? "";
  const backNodeId = d.backNodeId ?? "";
  const backAssigneePolicy = d.backAssigneePolicy ?? "auto";

  // 驳回节点候选：沿入边反向 BFS 收集当前节点的所有上游（祖先），再过滤出任务类（serviceTask/userTask）。
  // 「驳回」语义是回退到上游，不允许顺流跳到下游（避免永动环）；开始/结束/网关不可驳回。
  const backNodeOptions = (() => {
    const upstream = new Set<string>();
    const queue = [node.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of edges) {
        if (e.target === cur && !upstream.has(e.source)) {
          upstream.add(e.source);
          queue.push(e.source);
        }
      }
    }
    upstream.delete(node.id); // 防御：成环时可能绕回自身，去掉
    return nodes.filter((n) => {
      if (!upstream.has(n.id)) return false;
      const meta = PROCESS_NODE_REGISTRY[(n.type as ProcessNodeKind) ?? "serviceTask"];
      return meta.shape === "task";
    });
  })();

  // 回显候选用户名：挂载时按已存 candidateUsers ids 拉展示名并入 __names（若无）。
  useEffect(() => {
    const ids = (d.candidateUsers ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const missing = ids.filter((id) => !names[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    selectorInitByIds(missing.map(Number))
      .then((list) => {
        if (cancelled) return;
        const added: Record<string, string> = {};
        for (const u of list) added[String(u.id)] = u.nickname || u.username;
        if (Object.keys(added).length > 0) onChange({ __names: { ...names, ...added } });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // 仅在 candidateUsers 变化时补名（names 一并入 dep 会循环，故只读最新即可）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.candidateUsers]);

  // 合并展示名映射（选择器内部也会补，统一进 __names）。
  function mergeNames(added: Record<string, string>) {
    if (Object.keys(added).length === 0) return;
    onChange({ __names: { ...names, ...added } });
  }

  // passRate：限制 0~1 两位小数（输入时宽松，失焦/提交钳制）。仅会签显。
  function onPassRateChange(v: string) {
    onChange({ passRate: v });
  }
  function onPassRateBlur() {
    const n = Number(passRate);
    if (passRate.trim() === "" || Number.isNaN(n)) {
      onChange({ passRate: "1.00" });
      return;
    }
    const clamped = Math.min(1, Math.max(0, n));
    onChange({ passRate: clamped.toFixed(2) });
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">审批类型</Label>
        <Select
          value={approvalType}
          onValueChange={(v) => onChange({ approvalType: v })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="选择审批类型" />
          </SelectTrigger>
          <SelectContent position="popper">
            {APPROVAL_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {approvalType === "1" && (
        <div className="grid gap-1.5">
          <Label htmlFor="pass-rate" className="text-xs">会签通过率（0~1，两位小数）</Label>
          <Input
            id="pass-rate"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={passRate}
            disabled={readOnly}
            onChange={(e) => onPassRateChange(e.target.value)}
            onBlur={onPassRateBlur}
            className="h-9"
          />
        </div>
      )}

      <div className="grid gap-1.5">
        <Label className="text-xs">候选用户</Label>
        <CandidateUsersSelect
          value={d.candidateUsers ?? ""}
          names={names}
          disabled={readOnly}
          onChange={(ids, added) => {
            onChange({ candidateUsers: ids });
            mergeNames(added);
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">候选角色</Label>
        <CandidateRolesSelect
          value={d.candidateRoles ?? ""}
          disabled={readOnly}
          onChange={(ids, added) => {
            onChange({ candidateRoles: ids });
            mergeNames(added);
          }}
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">候选部门</Label>
        <CandidateDeptsSelect
          value={d.candidateDepts ?? ""}
          disabled={readOnly}
          onChange={(ids, added) => {
            onChange({ candidateDepts: ids });
            mergeNames(added);
          }}
        />
      </div>

      {/* 操作按钮：固定枚举多选，逗号串入 node.data.actionButtons。 */}
      <div className="grid gap-1.5">
        <Label className="text-xs">操作按钮</Label>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_BUTTONS.map((b) => {
            const on = actionButtons.includes(b.value);
            return (
              <button
                key={b.value}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  const next = on
                    ? actionButtons.filter((x) => x !== b.value)
                    : [...actionButtons, b.value];
                  const patch: Partial<ProcessNodeData> = { actionButtons: next.join(",") };
                  // 取消勾选「驳回」时清掉驳回相关配置。
                  if (b.value === "back" && on) {
                    patch.backType = undefined;
                    patch.backNodeId = undefined;
                    patch.backAssigneePolicy = undefined;
                  }
                  onChange(patch);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-background text-muted-foreground hover:bg-accent",
                  readOnly && "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                    on && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {on && <Check className="h-2.5 w-2.5" />}
                </span>
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 驳回配置：勾选「驳回」后显示。 */}
      {backEnabled && (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">驳回方式</Label>
            <Select
              value={backType}
              onValueChange={(v) => {
                const patch: Partial<ProcessNodeData> = { backType: v };
                // 切到非「指定节点」时清掉驳回节点。
                if (v !== "specific") patch.backNodeId = undefined;
                onChange(patch);
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="选择驳回方式" />
              </SelectTrigger>
              <SelectContent position="popper">
                {BACK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {backType === "specific" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">驳回节点</Label>
              {backNodeOptions.length === 0 ? (
                <p className="rounded-md border border-dashed px-2.5 py-2 text-[11px] text-muted-foreground">
                  无可驳回的上游任务节点
                </p>
              ) : (
                <Select
                  value={backNodeId}
                  onValueChange={(v) => onChange({ backNodeId: v })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="选择驳回到的节点" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {backNodeOptions.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.data.label || n.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">回退后任务分配策略</Label>
            <Select
              value={backAssigneePolicy}
              onValueChange={(v) => onChange({ backAssigneePolicy: v })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="选择分配策略" />
              </SelectTrigger>
              <SelectContent position="popper">
                {BACK_ASSIGNEE_POLICIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {BACK_ASSIGNEE_POLICIES.find((p) => p.value === backAssigneePolicy)?.hint ??
                "有上次办理人则派回，无则按配置重新分配"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  NEXT_TASK_CHOOSE_TYPES,
  NEXT_TASK_SINGLE_TYPE,
  type NextUserTaskInfo,
} from "@/types";

// 下一用户任务候选人选择（审批类型 7/8/9「上一节点选择」）。
// 仅渲染需处理人预先选人的节点（type∈{7,8,9} 且有 candidateUsers）；其它审批类型后端不返回候选人、不展示。
// 每个节点一个「选择器」：触发器 + 内联绝对定位下拉面板（不 portal——portal 面板易被遮挡/截获点击，且宽度对齐要靠 trigger-width 变量）。
//   7 单选（点选即关、再选替换；点已选=取消）；8/9 多选（面板常开切换）。面板带搜索过滤。
// 值=Record<nodeId, number[]>（选中人员 id 集合）：7 单选（集合大小 1），8/9 多选。提交时装进 ProcessHandleParam.nodeCandidateUsersChoose。

// 需要选人的下一任务（type∈{7,8/9} 且有候选人可选）。
export function chooseTypeInfos(
  infos?: NextUserTaskInfo[],
): NextUserTaskInfo[] {
  return (infos ?? []).filter(
    (i) =>
      i.type != null &&
      (NEXT_TASK_CHOOSE_TYPES as readonly number[]).includes(i.type) &&
      (i.candidateUsers?.length ?? 0) > 0,
  );
}

// 校验：每个需选人节点都已选（7 选 1，8/9 至少 1）。返回缺失的节点名列表（空=通过）。
export function missingChooseNodes(
  infos: NextUserTaskInfo[] | undefined,
  value: Record<string, number[]>,
): string[] {
  return chooseTypeInfos(infos)
    .filter((i) => (value[i.nodeId ?? ""]?.length ?? 0) === 0)
    .map((i) => i.nodeName ?? i.nodeId ?? "未命名节点");
}

// 候选人列表（选择器形式）。
export function NextTaskCandidatePicker({
  infos,
  value,
  disabled,
  onChange,
}: {
  /** 可能的下一用户任务（内部过滤出需选人的 7/8/9） */
  infos?: NextUserTaskInfo[];
  /** 当前选择：nodeId -> 选中人员 id 集合 */
  value: Record<string, number[]>;
  disabled?: boolean;
  /** 某节点选择变化：ids=该节点最新选中 id 集合 */
  onChange: (nodeId: string, ids: number[]) => void;
}) {
  const list = chooseTypeInfos(infos);
  if (list.length === 0) return null;

  // 多个选人任务按行网格排（最多 4 个/行，响应式：小屏 1、中屏 2、宽屏 4）。
  return (
    <div className="mt-6 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">以下节点由你指定处理人</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((info) => (
          <NodeCandidateSelect
            key={info.nodeId ?? ""}
            info={info}
            selected={value[info.nodeId ?? ""] ?? []}
            disabled={disabled}
            onChange={(ids) => info.nodeId != null && onChange(info.nodeId, ids)}
          />
        ))}
      </div>
    </div>
  );
}

// 单个节点的候选人选择器：触发器 + 内联下拉（宽度=触发器宽度）。
// 交互对齐同上下文已验证可用的 MultiSelectControl：选项用 div role=button、pointerdown 外部收起、面板无 autoFocus。
function NodeCandidateSelect({
  info,
  selected,
  disabled,
  onChange,
}: {
  info: NextUserTaskInfo;
  selected: number[];
  disabled?: boolean;
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const single = info.type === NEXT_TASK_SINGLE_TYPE;
  const candidates = (info.candidateUsers ?? []).filter((u) => u.id != null);

  // 点外部收起（pointerdown，与 MultiSelectControl 一致）。
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: number) {
    if (disabled) return;
    if (single) {
      // 单选：点已选=取消，点未选=替换为仅此项，并关面板。
      onChange(selected.includes(id) ? [] : [id]);
      setOpen(false);
    } else {
      // 多选：切换，面板常开。
      onChange(
        selected.includes(id)
          ? selected.filter((x) => x !== id)
          : [...selected, id],
      );
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? candidates.filter((u) => (u.nickname ?? "").toLowerCase().includes(q))
    : candidates;

  // 触发器展示：已选昵称（顿号连），空则占位。
  const selectedNames = candidates
    .filter((u) => selected.includes(u.id!))
    .map((u) => u.nickname ?? `#${u.id}`);

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">
        {info.nodeName ?? info.nodeId}
        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
          {single ? "选择 1 人" : "可多选"}
        </span>
      </span>
      {/* 相对容器：面板绝对定位在其中，宽度随触发器（填满所在网格格）。 */}
      <div ref={ref} className="relative w-full">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!disabled) setOpen((o) => !o);
            }
          }}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm font-normal transition-colors",
            "hover:bg-accent/50 focus:outline-none",
            open && "ring-2 ring-ring ring-offset-1 ring-offset-background",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span className={cn("truncate", selectedNames.length === 0 && "text-muted-foreground")}>
            {selectedNames.length > 0
              ? selectedNames.join("、")
              : single
                ? "选择处理人"
                : "选择处理人（可多选）"}
          </span>
          <ChevronDown
            className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
          />
        </div>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            <div className="border-b p-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索候选人..."
                className="h-8 border-0 text-xs shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  无匹配候选人
                </p>
              ) : (
                filtered.map((u) => {
                  const on = selected.includes(u.id!);
                  return (
                    // div role=button（对齐 MultiSelectControl，避开 button 嵌套/默认行为）。
                    <div
                      key={u.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => pick(u.id!)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pick(u.id!);
                        }
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        on && "bg-accent/60",
                      )}
                    >
                      <Check
                        className={cn("h-4 w-4 shrink-0", on ? "opacity-100" : "opacity-0")}
                      />
                      <span className="min-w-0 flex-1 truncate">{u.nickname ?? `#${u.id}`}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

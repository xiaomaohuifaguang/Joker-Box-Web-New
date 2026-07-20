"use client";

import { useState } from "react";
import { Check, ChevronRight, Minus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiPathKey, type MenuApiPathServer } from "@/types";

type TriState = "all" | "some" | "none";

// 三态勾选框：all=全选(实心对勾) / some=部分(横线) / none=空。
// 样式跟随 shadcn checkbox token（border-input / primary / primary-foreground）。
// shadcn Checkbox 只渲染对勾、无 indeterminate 图标，故这里自绘以支持三态。
function TriCheckbox({
  state,
  disabled,
  onChange,
  ariaLabel,
}: {
  state: TriState;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "grid size-4 shrink-0 place-content-center rounded-[4px] border border-input shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        state === "all" && "border-primary bg-primary text-primary-foreground",
        state === "some" && "border-primary text-primary",
      )}
    >
      {state === "all" && <Check className="size-3.5" />}
      {state === "some" && <Minus className="size-3.5" />}
    </button>
  );
}

// 计算一组可勾选 key 的三态。
function triState(keys: string[], selected: Set<string>): TriState {
  if (keys.length === 0) return "none";
  const hit = keys.filter((k) => selected.has(k)).length;
  if (hit === 0) return "none";
  if (hit === keys.length) return "all";
  return "some";
}

// 菜单 ↔ api 绑定树：服务 -> 分组 -> apiPath 三级。
// 白名单 api（whiteList=1）不计入可选、禁用勾选（无需绑定）。
// 选中集合由父级持有（受控）；本组件负责三态计算与切换。
export function ApiPathBindingTree({
  tree,
  loading,
  selected,
  onSelectedChange,
}: {
  tree: MenuApiPathServer[] | null;
  loading: boolean;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 py-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }
  if (!tree || tree.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        暂无可绑定的 api 路径
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {tree.map((svc) => (
        <ServerRow
          key={svc.server}
          svc={svc}
          selected={selected}
          onSelectedChange={onSelectedChange}
        />
      ))}
    </div>
  );
}

function ServerRow({
  svc,
  selected,
  onSelectedChange,
}: {
  svc: MenuApiPathServer;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(true);

  // 该服务下所有「可勾选（非白名单）」api 的 key。
  const selectable: string[] = [];
  for (const grp of svc.groups) {
    for (const ap of grp.apiPaths) {
      if (ap.whiteList !== "1") selectable.push(apiPathKey(ap.server, ap.path));
    }
  }
  const state = triState(selectable, selected);
  const hit = selectable.filter((k) => selected.has(k)).length;

  function toggle() {
    const next = new Set(selected);
    if (state === "all") selectable.forEach((k) => next.delete(k));
    else selectable.forEach((k) => next.add(k));
    onSelectedChange(next);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 py-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="展开/收起服务"
          >
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <TriCheckbox
          state={state}
          ariaLabel={`全选服务 ${svc.server}`}
          onChange={toggle}
        />
        <span className="text-sm font-medium">{svc.server}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {hit}/{selectable.length}
        </span>
      </div>
      <CollapsibleContent>
        <div className="ml-3.5 border-l border-border pl-1">
          {svc.groups.map((grp) => (
            <GroupRow
              key={grp.groupName}
              grp={grp}
              selected={selected}
              onSelectedChange={onSelectedChange}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function GroupRow({
  grp,
  selected,
  onSelectedChange,
}: {
  grp: MenuApiPathServer["groups"][number];
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(true);
  const selectable = grp.apiPaths
    .filter((ap) => ap.whiteList !== "1")
    .map((ap) => apiPathKey(ap.server, ap.path));
  const state = triState(selectable, selected);

  function toggle() {
    const next = new Set(selected);
    if (state === "all") selectable.forEach((k) => next.delete(k));
    else selectable.forEach((k) => next.add(k));
    onSelectedChange(next);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2 py-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="展开/收起分组"
          >
            <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <TriCheckbox
          state={state}
          ariaLabel={`全选分组 ${grp.groupName}`}
          onChange={toggle}
        />
        <span className="text-sm text-muted-foreground">{grp.groupName}</span>
      </div>
      <CollapsibleContent>
        <div className="ml-3.5 border-l border-border pl-1">
          {grp.apiPaths.map((ap) => {
            const key = apiPathKey(ap.server, ap.path);
            const isWhite = ap.whiteList === "1";
            const checked = selected.has(key);
            return (
              <div
                key={key}
                className="flex items-center gap-2 py-1 pl-7"
                title={isWhite ? "白名单 api 无需绑定" : undefined}
              >
                <TriCheckbox
                  state={checked ? "all" : "none"}
                  disabled={isWhite}
                  ariaLabel={`绑定 ${ap.path}`}
                  onChange={() => {
                    if (isWhite) return;
                    const next = new Set(selected);
                    if (checked) next.delete(key);
                    else next.add(key);
                    onSelectedChange(next);
                  }}
                />
                <span className="font-mono text-xs break-all">{ap.path}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {ap.name}
                </span>
                {isWhite && (
                  <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                    白名单
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

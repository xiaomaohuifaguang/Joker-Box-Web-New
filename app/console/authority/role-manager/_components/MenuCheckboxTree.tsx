"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/types";
import { TriCheckbox, triState } from "@/components/TriCheckbox";

// 收集节点自身 + 所有子孙 id。
function collectSubtreeIds(
  node: MenuNode,
  acc: Set<number> = new Set(),
): Set<number> {
  acc.add(node.id);
  if (node.children) for (const c of node.children) collectSubtreeIds(c, acc);
  return acc;
}

// 菜单 checkbox 树（角色绑菜单用）：按 menuTreeAll 渲染，tri-state 父级，selected 为已选菜单 id。
// 与 ApiPathBindingTree 同构，但菜单无白名单，全部可勾选。selected 由父级持有（受控）。
export function MenuCheckboxTree({
  tree,
  selected,
  onSelectedChange,
}: {
  tree: MenuNode[];
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
}) {
  if (tree.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">暂无菜单</p>
    );
  }
  return (
    <div className="flex flex-col">
      {tree.map((node) => (
        <MenuNodeRow
          key={node.id}
          node={node}
          depth={0}
          selected={selected}
          onSelectedChange={onSelectedChange}
        />
      ))}
    </div>
  );
}

function MenuNodeRow({
  node,
  depth,
  selected,
  onSelectedChange,
}: {
  node: MenuNode;
  depth: number;
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const subtreeIds = [...collectSubtreeIds(node)];
  const state = triState(subtreeIds, selected);

  function toggle() {
    const next = new Set(selected);
    if (state === "all") subtreeIds.forEach((id) => next.delete(id));
    else subtreeIds.forEach((id) => next.add(id));
    onSelectedChange(next);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: depth * 16 }}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
              !hasChildren && "invisible",
            )}
            aria-label="展开/收起"
          >
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <TriCheckbox
          state={state}
          ariaLabel={`选择菜单 ${node.name}`}
          onChange={toggle}
        />
        <span className="text-sm">{node.name}</span>
      </div>
      {hasChildren && (
        <CollapsibleContent>
          <div className="ml-3.5 border-l border-border pl-1">
            {node.children!.map((c) => (
              <MenuNodeRow
                key={c.id}
                node={c}
                depth={depth + 1}
                selected={selected}
                onSelectedChange={onSelectedChange}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

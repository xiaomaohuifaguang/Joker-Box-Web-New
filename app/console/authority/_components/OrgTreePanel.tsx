"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrgTree } from "@/types";

// 统计真实机构数（排除虚拟根 id=-1）。
function countOrgs(nodes: OrgTree[] | null): number {
  if (!nodes) return 0;
  let n = 0;
  const walk = (list: OrgTree[]) => {
    for (const node of list) {
      if (node.id !== -1) n++;
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return n;
}

// 左：机构树。嵌套竖向导轨（border-l）+ chevron/圆点 + 子机构数 chip。
// 选中节点 -> onSelect(id)；选中虚拟根（全部）即查顶级机构。
export function OrgTreePanel({
  tree,
  loading,
  selectedId,
  onSelect,
}: {
  tree: OrgTree[] | null;
  loading: boolean;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const total = countOrgs(tree);
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="font-display text-sm font-semibold tracking-wide">
          机构树
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {total} 个机构
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {tree?.map((node) => (
              <OrgTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgTreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: OrgTree;
  depth: number;
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const hasChildren = !!node.children?.length;
  const childCount = node.children?.length ?? 0;
  const selected = selectedId === node.id;
  return (
    <Collapsible defaultOpen={depth === 0}>
      <div className="flex items-center">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            aria-label="展开/收起"
          >
            {hasChildren ? (
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
            ) : (
              <span className="h-1 w-1 rounded-full bg-border" />
            )}
          </button>
        </CollapsibleTrigger>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            selected
              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
              : "text-sidebar-foreground",
          )}
        >
          <span className="truncate">{node.name}</span>
          {hasChildren && (
            <span className="ml-auto shrink-0 rounded-full border px-1.5 font-mono text-[10px] leading-4 text-muted-foreground">
              {childCount}
            </span>
          )}
        </button>
      </div>
      {hasChildren && (
        <CollapsibleContent>
          <div className="ml-3.5 border-l border-border pl-1">
            {node.children!.map((child) => (
              <OrgTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CodeItem } from "@/types";

// ---- 纯函数：移动计算（string id，根 parentId = ""）----
// 树构建见 lib/codeTableTree.ts buildCodeItemTree（由调用方组树后传入）。

function collectAllIds(
  nodes: CodeItem[],
  acc: Set<string> = new Set(),
): Set<string> {
  for (const n of nodes) {
    acc.add(n.id);
    if (n.children?.length) collectAllIds(n.children, acc);
  }
  return acc;
}

function flattenVisible(
  nodes: CodeItem[],
  expanded: Set<string>,
  depth = 0,
  acc: { node: CodeItem; depth: number }[] = [],
): { node: CodeItem; depth: number }[] {
  for (const n of nodes) {
    acc.push({ node: n, depth });
    if (n.children?.length && expanded.has(n.id))
      flattenVisible(n.children, expanded, depth + 1, acc);
  }
  return acc;
}

// 不可变替换某父级的子数组（parentId === "" 为根）。
function mapChildren(
  nodes: CodeItem[],
  parentId: string,
  updater: (children: CodeItem[]) => CodeItem[],
): CodeItem[] {
  if (parentId === "") return updater(nodes);
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: updater(n.children ?? []) };
    if (n.children?.length)
      return { ...n, children: mapChildren(n.children, parentId, updater) };
    return n;
  });
}

function findNodeAndSubtree(
  nodes: CodeItem[],
  id: string,
): { node: CodeItem; subtreeIds: Set<string> } | null {
  for (const n of nodes) {
    if (n.id === id) return { node: n, subtreeIds: collectAllIds([n]) };
    if (n.children?.length) {
      const r = findNodeAndSubtree(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

// 拖拽移动：active 成为 over 的兄弟（newParentId = over.parentId），插在 over 前/后。
// 拖整棵子树只改 active 自身 parentId/sort；重算受影响父级兄弟 sort；防环。
function computeMove(
  tree: CodeItem[],
  activeId: string,
  over: CodeItem,
  pos: "before" | "after",
): { newTree: CodeItem[]; changed: CodeItem[] } | null {
  const found = findNodeAndSubtree(tree, activeId);
  if (!found) return null;
  const active = found.node;
  if (found.subtreeIds.has(over.id)) return null; // 防环

  const oldParentId = active.parentId;
  const newParentId = over.parentId;

  const removeActive = (nodes: CodeItem[]): CodeItem[] =>
    nodes
      .filter((n) => n.id !== activeId)
      .map((n) =>
        n.children?.length
          ? { ...n, children: removeActive(n.children) }
          : n,
      );

  const insertActive = (nodes: CodeItem[]): CodeItem[] => {
    const out: CodeItem[] = [];
    for (const n of nodes) {
      if (n.id === over.id && pos === "before")
        out.push({ ...active, parentId: newParentId });
      out.push(
        n.children?.length
          ? { ...n, children: insertActive(n.children) }
          : n,
      );
      if (n.id === over.id && pos === "after")
        out.push({ ...active, parentId: newParentId });
    }
    return out;
  };

  let nextTree = insertActive(removeActive(tree));

  for (const pid of new Set([oldParentId, newParentId])) {
    nextTree = mapChildren(nextTree, pid, (children) =>
      children.map((c, i) => ({ ...c, sort: i + 1 })),
    );
  }

  const oldMap = new Map<string, CodeItem>();
  const indexOld = (nodes: CodeItem[]) => {
    for (const n of nodes) {
      oldMap.set(n.id, n);
      if (n.children?.length) indexOld(n.children);
    }
  };
  indexOld(tree);
  const changed: CodeItem[] = [];
  const walk = (nodes: CodeItem[]) => {
    for (const n of nodes) {
      const old = oldMap.get(n.id);
      if (old && (old.sort !== n.sort || old.parentId !== n.parentId))
        changed.push({ ...n });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nextTree);
  return { newTree: nextTree, changed };
}

function posFromRects(
  activeRect: { top: number; height: number } | null | undefined,
  overRect: { top: number; height: number },
): "before" | "after" {
  if (!activeRect) return "after";
  return activeRect.top + activeRect.height / 2 <
    overRect.top + overRect.height / 2
    ? "before"
    : "after";
}

// ---- 组件 ----

export function CodeItemTreeTable({
  tree,
  loading,
  isTree,
  onEdit,
  onAddChild,
  onDelete,
  onReorder,
}: {
  tree: CodeItem[];
  loading: boolean;
  isTree: boolean;
  onEdit: (item: CodeItem) => void;
  onAddChild: (parent: CodeItem) => void;
  onDelete: (item: CodeItem) => void;
  onReorder: (changed: CodeItem[]) => Promise<void>;
}) {
  // 本地树（乐观更新）：随 prop 同步（prop 已是组好的树）。
  const [localTree, setLocalTree] = useState<CodeItem[]>(tree);
  const [prevTree, setPrevTree] = useState(tree);
  // 展开集合：新出现的 id 默认展开，已存在的保留用户折叠状态。
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());

  if (prevTree !== tree) {
    setPrevTree(tree);
    setLocalTree(tree);
    const ids = collectAllIds(tree);
    setKnownIds((prev) => new Set([...prev, ...ids]));
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) if (!knownIds.has(id)) next.add(id);
      return next;
    });
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overInfo, setOverInfo] = useState<{
    id: string;
    pos: "before" | "after";
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flat = useMemo(
    () => flattenVisible(localTree, expanded),
    [localTree, expanded],
  );
  const activeNode = activeId
    ? findNodeAndSubtree(localTree, activeId)?.node ?? null
    : null;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function expandAll() {
    setExpanded(new Set(collectAllIds(localTree)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }
  function onDragOver(e: DragOverEvent) {
    const { over } = e;
    if (!over) {
      setOverInfo(null);
      return;
    }
    setOverInfo({
      id: over.id as string,
      pos: posFromRects(e.active.rect.current.translated, over.rect),
    });
  }
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setOverInfo(null);
    if (!over || active.id === over.id) return;
    const overFound = findNodeAndSubtree(localTree, over.id as string);
    if (!overFound) return;
    const pos = posFromRects(e.active.rect.current.translated, over.rect);
    const result = computeMove(localTree, active.id as string, overFound.node, pos);
    if (!result) {
      toast.error("无法移动到自身或其子项下");
      return;
    }
    if (result.changed.length === 0) return;
    const oldTree = localTree;
    setLocalTree(result.newTree);
    try {
      await onReorder(result.changed);
    } catch {
      setLocalTree(oldTree);
      toast.error("移动失败，已还原");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverInfo(null);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-surface">
        {/* 视图工具条 */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">
            共 {collectAllIds(localTree).size} 项
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs">
              展开全部
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs">
              收起全部
            </Button>
          </div>
        </div>

        {/* 表头 */}
        <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_5rem_6rem] items-center border-b bg-surface px-4 py-2 text-xs font-medium text-muted-foreground lg:grid-cols-[2rem_1fr_10rem_4rem_5rem_6.5rem]">
          <span />
          <span>标签</span>
          <span className="hidden lg:block">值</span>
          <span className="hidden lg:block">排序</span>
          <span>状态</span>
          <span className="text-right">操作</span>
        </div>

        {/* 行 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2rem_1fr_5rem_6rem] items-center gap-2 border-b px-4 py-2 lg:grid-cols-[2rem_1fr_10rem_4rem_5rem_6.5rem]"
                >
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="hidden h-5 w-20 lg:block" />
                  <Skeleton className="hidden h-5 w-10 lg:block" />
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : localTree.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">暂无码表项</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  新建一个码表项开始。
                </p>
              </div>
            </div>
          ) : (
            <SortableContext
              items={flat.map((f) => f.node.id)}
              strategy={verticalListSortingStrategy}
            >
              {flat.map(({ node, depth }) => (
                <SortableRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  isTree={isTree}
                  expanded={expanded.has(node.id)}
                  hasChildren={!!node.children?.length}
                  overInfo={overInfo}
                  onToggleExpand={() => toggleExpand(node.id)}
                  onEdit={() => onEdit(node)}
                  onAddChild={() => onAddChild(node)}
                  onDelete={() => onDelete(node)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeNode && (
          <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 shadow-lg">
            <span className="text-sm font-medium">{activeNode.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {activeNode.value}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableRow({
  node,
  depth,
  isTree,
  expanded,
  hasChildren,
  overInfo,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: CodeItem;
  depth: number;
  isTree: boolean;
  expanded: boolean;
  hasChildren: boolean;
  overInfo: { id: string; pos: "before" | "after" } | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: node.id,
  });
  const isOver = overInfo?.id === node.id;
  const enabled = node.status === "1";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative grid grid-cols-[2rem_1fr_5rem_6rem] items-center border-b px-4 py-1.5 lg:grid-cols-[2rem_1fr_10rem_4rem_5rem_6.5rem]",
        isDragging && "opacity-40",
      )}
    >
      {isOver && overInfo && (
        <div
          className={cn(
            "absolute inset-x-0 h-0.5 bg-brand",
            overInfo.pos === "before" ? "top-0" : "bottom-0",
          )}
        />
      )}

      {/* 拖把手 */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 标签（树形缩进） */}
      <div
        className="flex min-w-0 items-center gap-1.5"
        style={{ paddingLeft: depth * 20 }}
      >
        <button
          type="button"
          onClick={onToggleExpand}
          className={cn(
            "flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground",
            !hasChildren && "invisible",
          )}
          aria-label={expanded ? "收起" : "展开"}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-90",
            )}
          />
        </button>
        <span className="truncate text-sm font-medium">{node.label}</span>
        {!enabled && (
          <span className="text-[10px] text-muted-foreground">停用</span>
        )}
      </div>

      {/* 值 */}
      <div className="hidden truncate font-mono text-xs text-muted-foreground lg:block">
        {node.value}
      </div>

      {/* 排序 */}
      <div className="hidden font-mono text-xs text-muted-foreground lg:block">
        {node.sort}
      </div>

      {/* 状态 */}
      <div>
        <Badge
          variant={enabled ? "default" : "outline"}
          className={cn(
            enabled ? "bg-brand text-background" : "text-muted-foreground",
          )}
        >
          {enabled ? "启用" : "停用"}
        </Badge>
      </div>

      {/* 操作 */}
      <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
          aria-label="编辑"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {isTree && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddChild}
            aria-label="新增子项"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
          aria-label="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

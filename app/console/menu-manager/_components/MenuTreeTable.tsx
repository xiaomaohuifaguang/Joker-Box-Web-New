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
import type { MenuNode } from "@/types";
import { MenuIcon } from "@/components/menuIcons";

// ---- 纯函数：树的遍历与移动计算 ----

function collectAllIds(
  nodes: MenuNode[],
  acc: Set<number> = new Set(),
): Set<number> {
  for (const n of nodes) {
    acc.add(n.id);
    if (n.children?.length) collectAllIds(n.children, acc);
  }
  return acc;
}

// 扁平化可见树（按展开状态），保留 depth 用于缩进。
function flattenVisible(
  nodes: MenuNode[],
  expanded: Set<number>,
  depth = 0,
  acc: { node: MenuNode; depth: number }[] = [],
): { node: MenuNode; depth: number }[] {
  for (const n of nodes) {
    acc.push({ node: n, depth });
    if (n.children?.length && expanded.has(n.id))
      flattenVisible(n.children, expanded, depth + 1, acc);
  }
  return acc;
}

// 不可变替换某父级（-1=根）的子数组。
function mapChildren(
  nodes: MenuNode[],
  parentId: number,
  updater: (children: MenuNode[]) => MenuNode[],
): MenuNode[] {
  if (parentId === -1) return updater(nodes);
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: updater(n.children ?? []) };
    if (n.children?.length)
      return { ...n, children: mapChildren(n.children, parentId, updater) };
    return n;
  });
}

// 查找节点 + 其子树 id 集合。
function findNodeAndSubtree(
  nodes: MenuNode[],
  id: number,
): { node: MenuNode; subtreeIds: Set<number> } | null {
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
// 拖整棵子树时只改 active 自身的 parentId/sort，子孙 parentId 不变。
// 重算受影响父级兄弟的 sort（dense 1..N）；非法（环/未找到）返回 null。
function computeMove(
  tree: MenuNode[],
  activeId: number,
  over: MenuNode,
  pos: "before" | "after",
): { newTree: MenuNode[]; changed: MenuNode[] } | null {
  const found = findNodeAndSubtree(tree, activeId);
  if (!found) return null;
  const active = found.node;
  if (found.subtreeIds.has(over.id)) return null; // 防环

  const oldParentId = active.parentId;
  const newParentId = over.parentId;

  const removeActive = (nodes: MenuNode[]): MenuNode[] =>
    nodes
      .filter((n) => n.id !== activeId)
      .map((n) =>
        n.children?.length
          ? { ...n, children: removeActive(n.children) }
          : n,
      );

  const insertActive = (nodes: MenuNode[]): MenuNode[] => {
    const out: MenuNode[] = [];
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

  // 重算受影响父级兄弟的 sort
  for (const pid of new Set([oldParentId, newParentId])) {
    nextTree = mapChildren(nextTree, pid, (children) =>
      children.map((c, i) => ({ ...c, sort: i + 1 })),
    );
  }

  // 收集变化节点（与原树对比 sort/parentId）
  const oldMap = new Map<number, MenuNode>();
  const indexOld = (nodes: MenuNode[]) => {
    for (const n of nodes) {
      oldMap.set(n.id, n);
      if (n.children?.length) indexOld(n.children);
    }
  };
  indexOld(tree);
  const changed: MenuNode[] = [];
  const walk = (nodes: MenuNode[]) => {
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

// 由拖拽中 active/over 的矩形判定插在 over 上方还是下方。
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

export function MenuTreeTable({
  tree,
  loading,
  onEdit,
  onAddChild,
  onDelete,
  onReorder,
}: {
  tree: MenuNode[] | null;
  loading: boolean;
  onEdit: (node: MenuNode) => void;
  onAddChild: (parent: MenuNode) => void;
  onDelete: (node: MenuNode) => void;
  onReorder: (changed: MenuNode[]) => Promise<void>;
}) {
  // 本地树（乐观更新）：随 prop 同步。
  const [localTree, setLocalTree] = useState<MenuNode[]>(tree ?? []);
  const [prevTree, setPrevTree] = useState(tree);
  // 展开集合：新出现的 id 默认展开，已存在的保留用户折叠状态。
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());

  if (prevTree !== tree) {
    setPrevTree(tree);
    setLocalTree(tree ?? []);
    const ids = collectAllIds(tree ?? []);
    setKnownIds((prev) => new Set([...prev, ...ids]));
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of ids) if (!knownIds.has(id)) next.add(id);
      return next;
    });
  }

  const [activeId, setActiveId] = useState<number | null>(null);
  const [overInfo, setOverInfo] = useState<{
    id: number;
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
  const totalCount = collectAllIds(localTree).size;

  function toggleExpand(id: number) {
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
    setActiveId(e.active.id as number);
  }
  function onDragOver(e: DragOverEvent) {
    const { over } = e;
    if (!over) {
      setOverInfo(null);
      return;
    }
    setOverInfo({
      id: over.id as number,
      pos: posFromRects(
        e.active.rect.current.translated,
        over.rect,
      ),
    });
  }
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setOverInfo(null);
    if (!over || active.id === over.id) return;
    const overFound = findNodeAndSubtree(localTree, over.id as number);
    if (!overFound) return;
    const pos = posFromRects(
      e.active.rect.current.translated,
      over.rect,
    );
    const result = computeMove(
      localTree,
      active.id as number,
      overFound.node,
      pos,
    );
    if (!result) {
      toast.error("无法移动到自身或其子菜单下");
      return;
    }
    if (result.changed.length === 0) return;
    const oldTree = localTree;
    setLocalTree(result.newTree); // 乐观
    try {
      await onReorder(result.changed);
    } catch {
      setLocalTree(oldTree); // 回滚
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
            共 {totalCount} 项 · {localTree.length} 个顶级
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
        <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_5rem_6rem] items-center border-b bg-surface px-4 py-2 text-xs font-medium text-muted-foreground lg:grid-cols-[2rem_1fr_13rem_5rem_7.5rem_6.5rem]">
          <span />
          <span>菜单</span>
          <span className="hidden lg:block">路径</span>
          <span>白名单</span>
          <span className="hidden lg:block">更新时间</span>
          <span className="text-right">操作</span>
        </div>

        {/* 行 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2rem_1fr_5rem_6rem] items-center gap-2 border-b px-4 py-2 lg:grid-cols-[2rem_1fr_13rem_5rem_7.5rem_6.5rem]"
                >
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="hidden h-5 w-24 lg:block" />
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="hidden h-5 w-20 lg:block" />
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
                <p className="text-sm font-medium text-foreground">暂无菜单</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  新建一个顶级菜单开始组织导航。
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
            <IconChip name={activeNode.icon} />
            <span className="text-sm font-medium">{activeNode.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {activeNode.path}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function IconChip({ name }: { name: string }) {
  if (!name) return null;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border text-felt">
      <MenuIcon name={name} className="h-3.5 w-3.5" />
    </span>
  );
}

function SortableRow({
  node,
  depth,
  expanded,
  hasChildren,
  overInfo,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
}: {
  node: MenuNode;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  overInfo: { id: number; pos: "before" | "after" } | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: node.id,
  });
  const isOver = overInfo?.id === node.id;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative grid grid-cols-[2rem_1fr_5rem_6rem] items-center border-b px-4 py-1.5 lg:grid-cols-[2rem_1fr_13rem_5rem_7.5rem_6.5rem]",
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

      {/* 菜单：图标 + 名称（签名：忠实导航项预览），树形缩进 */}
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
        <IconChip name={node.icon} />
        <span className="truncate text-sm font-medium">{node.name}</span>
      </div>

      {/* 路径 */}
      <div className="hidden truncate font-mono text-xs text-muted-foreground lg:block">
        {node.path}
      </div>

      {/* 白名单 */}
      <div>
        <Badge
          variant={node.whiteList === "1" ? "default" : "outline"}
          className={cn(
            node.whiteList === "1"
              ? "bg-brand text-background"
              : "text-muted-foreground",
          )}
        >
          {node.whiteList === "1" ? "是" : "否"}
        </Badge>
      </div>

      {/* 更新时间 */}
      <div className="hidden truncate font-mono text-xs text-muted-foreground lg:block">
        {node.updateTime}
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddChild}
          aria-label="新增子菜单"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
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

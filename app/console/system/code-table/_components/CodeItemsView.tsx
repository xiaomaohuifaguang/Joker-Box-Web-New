"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCodeItem,
  getCodeTableDetail,
  updateCodeItem,
} from "@/lib/api/codeTable";
import { buildCodeItemTree } from "@/lib/codeTableTree";
import { ApiError } from "@/lib/api";
import { useCodeItems } from "@/hooks/useCodeItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CodeItem, CodeTable } from "@/types";
import { CodeItemTreeTable } from "./CodeItemTreeTable";
import { CodeItemFormDialog } from "./CodeItemFormDialog";
import { CodeTableFormDialog } from "./CodeTableFormDialog";

// 码表项视图：头部（码表详情 + 编辑码表 + 返回）+ 项表（树形/扁平 + 拖拽）+ 项 CRUD。
export function CodeItemsView({
  tableId,
  onBack,
}: {
  tableId: string;
  onBack: () => void;
}) {
  const [table, setTable] = useState<CodeTable | null>(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [labelInput, setLabelInput] = useState("");
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("");

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editing, setEditing] = useState<CodeItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState("");
  const [deleting, setDeleting] = useState<CodeItem | null>(null);
  const [tableFormOpen, setTableFormOpen] = useState(false);

  // tableId/refreshKey 变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const detailKey = `${tableId}|${refreshKey}`;
  const [prevDetailKey, setPrevDetailKey] = useState(detailKey);
  if (prevDetailKey !== detailKey) {
    setPrevDetailKey(detailKey);
    setTableLoading(true);
  }

  // 拉码表详情（头部 + isTree 标志）
  useEffect(() => {
    let cancelled = false;
    getCodeTableDetail(tableId)
      .then((t) => {
        if (!cancelled) setTable(t);
      })
      .catch(() => {
        if (!cancelled) setTable(null);
      })
      .finally(() => {
        if (!cancelled) setTableLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tableId, refreshKey]);

  // 项标签搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setLabel(labelInput), 300);
    return () => clearTimeout(t);
  }, [labelInput]);

  const { items, loading } = useCodeItems({
    tableId,
    label,
    status,
    refreshKey,
  });
  const tree = useMemo(() => buildCodeItemTree(items ?? []), [items]);
  const isTree = table?.tree === "1";

  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  // 拖拽落定：逐个更新被移动项，全部成功后刷新。
  async function handleReorder(changed: CodeItem[]) {
    await Promise.all(changed.map(updateCodeItem));
    setRefreshKey((k) => k + 1);
  }

  function openAddItem() {
    setEditing(null);
    setDefaultParentId("");
    setItemFormOpen(true);
  }
  function openEditItem(item: CodeItem) {
    setEditing(item);
    setDefaultParentId("");
    setItemFormOpen(true);
  }
  function openAddChild(parent: CodeItem) {
    setEditing(null);
    setDefaultParentId(parent.id);
    setItemFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCodeItem(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      handleMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 头部 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        {tableLoading ? (
          <Skeleton className="h-6 w-40" />
        ) : table ? (
          <>
            <span className="font-mono text-sm text-muted-foreground">
              {table.code}
            </span>
            <h1 className="font-display text-lg font-semibold">{table.name}</h1>
            <Badge variant={table.tree === "1" ? "default" : "outline"}>
              {table.tree === "1" ? "树形" : "扁平"}
            </Badge>
            <Badge
              variant={table.status === "1" ? "default" : "outline"}
              className={
                table.status === "1"
                  ? "bg-brand text-background"
                  : "text-muted-foreground"
              }
            >
              {table.status === "1" ? "启用" : "停用"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTableFormOpen(true)}
              className="ml-auto"
            >
              <Pencil className="h-4 w-4" />
              编辑码表
            </Button>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">码表不存在</span>
        )}
      </div>

      {/* 项筛选 + 新增 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="搜索标签"
            className="h-9 w-48 pl-8"
          />
        </div>
        <Select
          value={status || "__all"}
          onValueChange={(v) => setStatus(v === "__all" ? "" : v)}
        >
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">全部状态</SelectItem>
            <SelectItem value="1">启用</SelectItem>
            <SelectItem value="0">停用</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openAddItem} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增码表项
        </Button>
      </div>

      {/* 项表 */}
      <CodeItemTreeTable
        tree={tree}
        loading={loading}
        isTree={!!isTree}
        onEdit={openEditItem}
        onAddChild={openAddChild}
        onDelete={setDeleting}
        onReorder={handleReorder}
      />

      <CodeItemFormDialog
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        tableId={tableId}
        isTree={!!isTree}
        editing={editing}
        defaultParentId={defaultParentId}
        nodes={tree}
        onSuccess={handleMutated}
      />

      <CodeTableFormDialog
        open={tableFormOpen}
        onOpenChange={setTableFormOpen}
        editing={table}
        onSuccess={handleMutated}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除码表项「{deleting?.label}」？</AlertDialogTitle>
            <AlertDialogDescription>
              若有子项会一并影响，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

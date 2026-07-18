"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useOrgPage } from "@/hooks/useOrgPage";
import { removeOrg } from "@/lib/api/org";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";
import type { Org, OrgTree } from "@/types";
import { OrgFormDialog } from "./OrgFormDialog";

const PAGE_SIZES = [10, 20, 50];

// 生成分页页码：总页数 ≤7 全显示；否则首尾各保留 + 当前页窗口，中间用省略号。
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// 查找从根到 id 的路径（含两端）。
function findPath(nodes: OrgTree[], id: number): OrgTree[] {
  for (const n of nodes) {
    if (n.id === id) return [n];
    if (n.children?.length) {
      const sub = findPath(n.children, id);
      if (sub.length) return [n, ...sub];
    }
  }
  return [];
}

// 右：机构列表。parentId 由树选中决定；顶栏面包屑回显选中机构路径，可点跳转。
export function OrgListPanel({
  parentId,
  refreshKey,
  tree,
  onSelect,
  onMutated,
}: {
  parentId: number;
  refreshKey: number;
  tree: OrgTree[];
  onSelect: (id: number) => void;
  onMutated: () => void;
}) {
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [deleting, setDeleting] = useState<Org | null>(null);

  // 搜索防抖：输入停 300ms 后触发查询并回到第 1 页。
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useOrgPage({
    parentId,
    current,
    size,
    search,
    refreshKey,
  });

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);
  const path = findPath(tree, parentId);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(row: Org) {
    setEditing(row);
    setFormOpen(true);
  }
  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeOrg(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      onMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏：面包屑 + 计数 + 搜索 + 新增 */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {path.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            path.map((node, i) => (
              <Fragment key={node.id}>
                {i > 0 && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(node.id)}
                  className={cn(
                    "truncate transition-colors hover:text-foreground",
                    i === path.length - 1
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {node.name}
                </button>
              </Fragment>
            ))
          )}
        </nav>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {total} 条
        </span>
        <div className="relative shrink-0">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索机构名称"
            className="h-9 w-52 pl-8"
          />
        </div>
        <Button onClick={openAdd} size="sm" className="shrink-0">
          <Plus className="h-4 w-4" />
          新增
        </Button>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">
                机构名称
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                父级机构
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                创建时间
              </TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">
                更新时间
              </TableHead>
              <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-48">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        暂无子机构
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        在这里新建一个机构。
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={openAdd}>
                      <Plus className="h-4 w-4" />
                      新增机构
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              records.map((org) => (
                <TableRow key={org.id} className="group">
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.parentName || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {org.createTime}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {org.updateTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(org)}
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(org)}
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页：共 X 条 + 页码(带省略) + 上下页 + 页大小 */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current <= 1}
            onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === current ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrent(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current >= totalPages}
            onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v));
              setCurrent(1);
            }}
          >
            <SelectTrigger className="ml-2 h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / 页
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrgFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tree={tree}
        editing={editing}
        defaultParentId={parentId}
        onSuccess={onMutated}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除机构「{deleting?.name}」，此操作不可撤销。若其下有子机构，后端可能拒绝。
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

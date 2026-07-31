"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, ChevronLeft, ChevronRight, Eye, Pencil, Plus, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  deployProcessDefinition,
  removeProcessDefinition,
  stopProcessDefinition,
} from "@/lib/api/process";
import { useProcessDefinitionPage } from "@/hooks/useProcessDefinitionPage";
import { Badge } from "@/components/ui/badge";
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
import type { ProcessDefinition } from "@/types";

const PAGE_SIZES = [10, 20, 50];

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "0": { label: "草稿", variant: "secondary" },
  "1": { label: "已发布", variant: "default" },
  "-1": { label: "停用", variant: "outline" },
};

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// 流程定义列表：标题 + 搜索 + 表格 + 分页。布局对齐其它后台页（h1 + flex h-full flex-col gap-4）。
// 操作列预留（接口待后端提供）：草稿=查看/编辑/删除；已发布=查看/停用；已停用=查看/编辑/发布。
export function ProcessListPanel({
  onDesign,
  onView,
}: {
  onDesign: (id: number | null) => void;
  onView: (id: number) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState<ProcessDefinition | null>(null);
  const [publishing, setPublishing] = useState<ProcessDefinition | null>(null);
  const [stopping, setStopping] = useState<ProcessDefinition | null>(null);
  const { page, loading } = useProcessDefinitionPage({ search, current, size, refreshKey });

  // 搜索防抖。
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 删除/停用/发布：成功后刷新列表。
  async function confirmDelete() {
    if (deleting?.id == null) return;
    try {
      await removeProcessDefinition(deleting.id);
      toast.success("已删除");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    } finally {
      setDeleting(null);
    }
  }
  async function confirmDeploy() {
    if (publishing?.id == null) return;
    try {
      await deployProcessDefinition(publishing.id);
      toast.success("已发布");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "发布失败");
    } finally {
      setPublishing(null);
    }
  }
  async function confirmStop() {
    if (stopping?.id == null) return;
    try {
      await stopProcessDefinition(stopping.id);
      toast.success("已停用");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "停用失败");
    } finally {
      setStopping(null);
    }
  }

  function reset() {
    setSearchInput("");
    setSearch("");
    setCurrent(1);
  }

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">流程设计</h1>
        <Button onClick={() => onDesign(null)} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增流程
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索流程名称"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>
      </div>

      {/* 表格 */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">名称</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">分类</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">描述</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">版本</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">状态</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">更新时间</TableHead>
              <TableHead className="w-32 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j} className={j === 1 || j === 2 || j === 5 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center text-sm text-muted-foreground">
                  还没有流程，点右上角「新增流程」开始
                </TableCell>
              </TableRow>
            ) : (
              records.map((p) => {
                const status = p.status ?? "0";
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell className="text-sm font-medium">{p.processName || "-"}</TableCell>
                    <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground lg:table-cell">
                      {p.processCategory || "-"}
                    </TableCell>
                    <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground lg:table-cell">
                      {p.processDescription || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.version || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS[status]?.variant ?? "secondary"}>
                        {STATUS[status]?.label ?? status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {p.updateTime || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        {/* 查看：全状态可看（只读视图） */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => p.id != null && onView(p.id)}
                          aria-label="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* 编辑：草稿 / 已停用 */}
                        {(status === "0" || status === "-1") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => p.id != null && onDesign(p.id)}
                            aria-label="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* 删除：仅草稿 */}
                        {status === "0" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleting(p)}
                            aria-label="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {/* 停用：仅已发布 */}
                        {status === "1" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setStopping(p)}
                            aria-label="停用"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {/* 发布：草稿 / 已停用 */}
                        {(status === "0" || status === "-1") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPublishing(p)}
                            aria-label="发布"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v));
              setCurrent(1);
            }}
          >
            <SelectTrigger className="h-8 w-28">
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
        </div>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.processName}」？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认发布「{publishing?.processName}」？</AlertDialogTitle>
            <AlertDialogDescription>发布后流程对外可用，发布态不可再编辑。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeploy}>发布</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!stopping} onOpenChange={(o) => !o && setStopping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停用「{stopping?.processName}」？</AlertDialogTitle>
            <AlertDialogDescription>停用后流程不可再使用，可重新发布。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStop}>停用</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

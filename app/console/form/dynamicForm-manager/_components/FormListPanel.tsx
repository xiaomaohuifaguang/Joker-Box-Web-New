"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Eye, Pencil, Plus, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { deployDynamicForm, removeDynamicForm, stopDynamicForm } from "@/lib/api/dynamicForm";
import { ApiError } from "@/lib/api";
import { useDynamicFormPage } from "@/hooks/useDynamicFormPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { DynamicForm } from "@/types";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

const STATUS: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  "0": { label: "草稿", variant: "secondary" },
  "1": { label: "已发布", variant: "success" },
  "-1": { label: "停用", variant: "outline" },
};

// 表单模板列表：标题 + 搜索 + 表格 + 分页。布局对齐其它后台页（h1 + flex h-full flex-col gap-4）。
// 操作列按状态开放：草稿=编辑/删除/发布；已发布=查看/停用；停用=编辑/发布。
export function FormListPanel({
  onDesign,
  onView,
}: {
  onDesign: (id: string | null) => void;
  onView: (form: DynamicForm) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState<DynamicForm | null>(null);
  const [publishing, setPublishing] = useState<DynamicForm | null>(null);
  const [stopping, setStopping] = useState<DynamicForm | null>(null);
  const { page, loading } = useDynamicFormPage({ search, current, size, refreshKey });

  // 搜索防抖。
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function confirmDelete() {
    if (!deleting?.id) return;
    try {
      await removeDynamicForm(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  async function confirmDeploy() {
    if (!publishing?.id) return;
    try {
      await deployDynamicForm(publishing.id);
      toast.success("已发布");
      setPublishing(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "发布失败");
    }
  }

  async function confirmStop() {
    if (!stopping?.id) return;
    try {
      await stopDynamicForm(stopping.id);
      toast.success("已停用");
      setStopping(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "停用失败");
    }
  }

  function reset() {
    setSearchInput("");
    setSearch("");
    setCurrent(1);
  }

  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-page-title font-semibold">表单设计</h1>
        <Button onClick={() => onDesign(null)} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增表单
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索表单名称"
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
              <TableHead>名称</TableHead>
              <TableHead className="hidden lg:table-cell">描述</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden lg:table-cell">更新时间</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className={j === 1 || j === 4 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={6} title="还没有表单，点右上角「新增表单」开始" />
            ) : (
              records.map((f) => (
                <TableRow key={f.id} className="group">
                  <TableCell className="text-sm font-medium">{f.name}</TableCell>
                  <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground lg:table-cell">
                    {f.description || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.version || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS[f.status ?? "0"]?.variant ?? "secondary"}>
                      {STATUS[f.status ?? "0"]?.label ?? f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell tabular-nums">
                    {f.updateTime || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      {/* 草稿：编辑 / 删除 / 发布 */}
                      {(f.status ?? "0") === "0" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => f.id && onDesign(f.id)}
                            aria-label="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleting(f)}
                            aria-label="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPublishing(f)}
                            aria-label="发布"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {/* 已发布：查看 / 停用 */}
                      {f.status === "1" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onView(f)}
                            aria-label="查看"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setStopping(f)}
                            aria-label="停用"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {/* 停用：编辑 / 发布 */}
                      {f.status === "-1" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => f.id && onDesign(f.id)}
                            aria-label="编辑"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPublishing(f)}
                            aria-label="发布"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <DataPagination
        current={current}
        size={size}
        total={total}
        onCurrentChange={setCurrent}
        onSizeChange={(s) => {
          setSize(s);
          setCurrent(1);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.name}」？</AlertDialogTitle>
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
            <AlertDialogTitle>确认发布「{publishing?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>发布后表单对外可用，发布态不可再编辑。</AlertDialogDescription>
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
            <AlertDialogTitle>确认停用「{stopping?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>停用后表单不可再使用，可重新发布。</AlertDialogDescription>
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

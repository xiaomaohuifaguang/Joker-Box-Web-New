"use client";

import { useEffect, useState } from "react";

import type {AiChannel} from "@/types";
import {Button} from "@/components/ui/button";
import { Eye, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Skeleton} from "@/components/ui/skeleton";
import {useAiChannelPage} from "@/hooks/useAiChannelPage";
import {toast} from "sonner";
import {ApiError} from "@/lib/api";
import {removeAiChannel} from "@/lib/api/aiChannel";
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription, AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AiChannelFormDialog } from "./_components/AiChannelFormDialog";
import { AiChannelDetailDialog } from "./_components/AiChannelDetailDialog";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";


// 列表不展示完整密钥（查看详情或编辑时才显示）。
function maskSecret(value?: string | null): string {
  if (!value) return "-";
  if (value.length <= 10) return "••••••";
  return `${value.slice(0, 6)}••••••${value.slice(-4)}`;
}

export default function AiChannelPage() {

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [current, setCurrent] = useState(1);
    const [size, setSize] = useState(10);
    const [refreshKey, setRefreshKey] = useState(0);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<AiChannel | null>(null);
    const [viewing, setViewing] = useState<AiChannel | null>(null);
    const [deleting, setDeleting] = useState<AiChannel | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput);
            setCurrent(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { page, loading } = useAiChannelPage({
        search,
        current,
        size,
        refreshKey,
    });

    const records = page?.records ?? [];
    const total = page?.total ?? 0;

    function openAdd() {
        setEditing(null);
        setFormOpen(true);
    }
    function openEdit(record: AiChannel) {
        setEditing(record);
        setFormOpen(true);
    }

    function handleMutated() {
        setRefreshKey((k) => k + 1);
    }

    async function confirmDelete() {
        if (!deleting) return;
        try {
            await removeAiChannel(deleting);
            toast.success("已删除");
            setDeleting(null);
            handleMutated();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "删除失败");
        }
    }

    function reset() {
        setSearchInput("");
        setSearch("");
        setCurrent(1);
    }

        return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-page-title font-semibold">渠道管理</h1>
                <Button
                        onClick={openAdd}
                        size="sm" className="ml-auto">
                    <Plus className="h-4 w-4" />
                    新增
                </Button>
            </div>

            {/* 筛选 */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="搜索"
                    className="h-9 w-56 pl-8"
                    />
                </div>
                <Button
                        variant="ghost"
                        size="sm"
                        onClick={reset}
                        className="text-muted-foreground"
                >
                    <RotateCcw className="h-4 w-4" />
                    重置
                </Button>
            </div>

            {/* 表格 */}
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                                <TableHead className="hidden md:table-cell">
                                    ID
                                </TableHead>
                                <TableHead>
                                    渠道名称
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    供应商
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    API Key
                                </TableHead>
                            <TableHead className="w-24 text-right">
                                操作
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell
                                    key={j}
                                    className={
                                    j === 0 || j === 2 || j === 3 ? "hidden md:table-cell" : ""
                            }
                            >
                            <Skeleton className="h-6 w-full" />
                            </TableCell>
                            ))}
                        </TableRow>
                        ))
                        ) : records.length === 0 ? (
                        <TableEmptyRow colSpan={5} title="暂无渠道" description="调整搜索条件，或点右上角新增。" />
                        ) : (
                        records.map((record) => (
                        <TableRow key={record.id} className="group">
                                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                    {record.id ?? "-"}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                    {record.name ?? "-"}
                                </TableCell>
                                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                    {record.isCustom ? "自定义渠道" : record.providerName ?? "-"}
                                </TableCell>
                                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                    {maskSecret(record.apiKey)}
                                </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                    <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setViewing(record)}
                                    aria-label="查看详情"
                                    >
                                    <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEdit(record)}
                                    aria-label="编辑"
                                    >
                                    <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleting(record)}
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
            <AiChannelFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    editing={editing}
                    onSuccess={handleMutated}
            />
            <AiChannelDetailDialog
                    detail={viewing}
                    onClose={() => setViewing(null)}
            />
            <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        确认删除「」？
                    </AlertDialogTitle>
                    <AlertDialogDescription>此操作不可撤销。</AlertDialogDescription>
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

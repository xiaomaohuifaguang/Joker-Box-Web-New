"use client";

import { useEffect, useState } from "react";

import type {AiProvider} from "@/types";
import {Button} from "@/components/ui/button";
import { Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Skeleton} from "@/components/ui/skeleton";
import {useAiProviderPage} from "@/hooks/useAiProviderPage";
import {toast} from "sonner";
import {ApiError} from "@/lib/api";
import {removeAiProvider} from "@/lib/api/aiProvider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AiProviderFormDialog } from "./_components/AiProviderFormDialog";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";


export default function AiProviderPage() {

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [current, setCurrent] = useState(1);
    const [size, setSize] = useState(10);
    const [refreshKey, setRefreshKey] = useState(0);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<AiProvider | null>(null);
    const [deleting, setDeleting] = useState<AiProvider | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setSearch(searchInput);
            setCurrent(1);
        }, 300);
        return () => clearTimeout(t);
    }, [searchInput]);

    const { page, loading } = useAiProviderPage({
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
    function openEdit(record: AiProvider) {
        setEditing(record);
        setFormOpen(true);
    }

    function handleMutated() {
        setRefreshKey((k) => k + 1);
    }

    async function confirmDelete() {
        if (!deleting) return;
        try {
            await removeAiProvider(deleting);
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
                <h1 className="text-page-title font-semibold">供应商管理</h1>
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
                                供应商id
                            </TableHead>
                            <TableHead className="hidden md:table-cell">
                                供应商名称
                            </TableHead>
                            <TableHead className="hidden md:table-cell">
                                供应商baseurl
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
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <TableCell
                                            key={j}
                                            className={
                                                j === 1 || j === 2 ? "hidden md:table-cell" : ""
                                            }
                                        >
                                            <Skeleton className="h-6 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : records.length === 0 ? (
                            <TableEmptyRow colSpan={4} title="暂无数据" />
                        ) : (
                            records.map((record) => (
                                <TableRow key={record.id} className="group">
                                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                        {record.id ?? "-"}
                                    </TableCell>
                                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                        {record.name ?? "-"}
                                    </TableCell>
                                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                        {record.baseUrl ?? "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
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
                                                className="h-8 w-8 text-destructive"
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
            <AiProviderFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editing={editing}
                onSuccess={handleMutated}
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

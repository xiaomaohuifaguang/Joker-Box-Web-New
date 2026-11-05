"use client";

import { useEffect, useState } from "react";
import { Eye, RotateCcw, Search } from "lucide-react";
import { useDynamicFormInstancePage } from "@/hooks/useDynamicFormInstancePage";
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
import type { DynamicFormInstance } from "@/types";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

// 表单实例列表：分页 + 搜索 + 查看（跳详情视图）。
export function InstanceListPanel({
  onView,
}: {
  onView: (instance: DynamicFormInstance) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useDynamicFormInstancePage({ search, current, size });
  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-page-title font-semibold">表单实例管理</h1>
      </div>

      {/* 搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索表单名称/实例ID"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setCurrent(1);
          }}
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
              <TableHead>表单名称</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>实例ID</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>修改时间</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={6} title="暂无表单实例" />
            ) : (
              records.map((inst) => (
                <TableRow key={inst.id} className="group">
                  <TableCell className="max-w-52 truncate text-sm font-medium">
                    {inst.formName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inst.version}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inst.id}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {inst.createTime}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {inst.updateTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onView(inst)}
                        aria-label="查看"
                      >
                        <Eye className="h-4 w-4" />
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
    </div>
  );
}

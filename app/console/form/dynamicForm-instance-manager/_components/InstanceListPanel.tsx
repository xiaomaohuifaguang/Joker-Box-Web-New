"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Search,
} from "lucide-react";
import { useDynamicFormInstancePage } from "@/hooks/useDynamicFormInstancePage";
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
import type { DynamicFormInstance } from "@/types";

const PAGE_SIZES = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

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
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">表单实例管理</h1>
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
              <TableHead className="text-xs font-medium text-muted-foreground">表单名称</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">版本</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">实例ID</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">创建时间</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">修改时间</TableHead>
              <TableHead className="w-20 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-40 text-center text-sm text-muted-foreground">
                  暂无表单实例
                </TableCell>
              </TableRow>
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inst.createTime}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
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
    </div>
  );
}

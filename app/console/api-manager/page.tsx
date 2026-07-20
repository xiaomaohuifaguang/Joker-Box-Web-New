"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Search,
} from "lucide-react";
import { useApiPathPage } from "@/hooks/useApiPathPage";
import { getRoleSelector } from "@/lib/api/apiPath";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApiPath, SelectOption } from "@/types";
import { ServerGroupCascader } from "./_components/ServerGroupCascader";
import { ApiPathEditDialog } from "./_components/ApiPathEditDialog";

const PAGE_SIZES = [10, 20, 50];

// 生成分页页码：总页数 ≤7 全显示；否则首尾各保留 + 当前页窗口，中间用省略号。
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// API 管理：筛选（搜索/角色/服务+分组级联）+ 表格 + 分页 + 白名单快速切换 + 编辑。
export default function ApiManagerPage() {
  const [searchInput, setSearch] = useState("");
  const [search, setSearchDebounced] = useState("");
  const [roleId, setRoleId] = useState("");
  const [server, setServer] = useState("");
  const [groupName, setGroupName] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [editItem, setEditItem] = useState<ApiPath | null>(null);

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 角色选择器
  useEffect(() => {
    getRoleSelector()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const { page, loading } = useApiPathPage({
    search,
    roleId,
    server,
    groupName,
    current,
    size,
    refreshKey,
  });

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  function reset() {
    setSearch("");
    setSearchDebounced("");
    setRoleId("");
    setServer("");
    setGroupName("");
    setCurrent(1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="font-display text-lg font-semibold">API 管理</h1>

      {/* 筛选区 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索路径/名称"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Select value={roleId} onValueChange={(v) => { setRoleId(v === "__all" ? "" : v); setCurrent(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="全部角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">全部角色</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.key} value={r.key}>
                {r.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ServerGroupCascader
          server={server}
          groupName={groupName}
          onChange={(s, g) => {
            setServer(s);
            setGroupName(g);
            setCurrent(1);
          }}
        />
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
              <TableHead className="text-xs font-medium text-muted-foreground">路径</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">服务</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">分组</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">白名单</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">创建时间</TableHead>
              <TableHead className="w-20 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-40 text-center text-sm text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              records.map((item, idx) => (
                <TableRow key={`${item.path}-${item.server}-${idx}`}>
                  <TableCell className="text-sm font-medium">{item.name || "-"}</TableCell>
                  <TableCell className="font-mono text-xs break-all">{item.path}</TableCell>
                  <TableCell className="text-sm">{item.server}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.groupName || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={(item.whiteList ?? "0") === "1" ? "default" : "outline"}
                      className={cn(
                        (item.whiteList ?? "0") === "1"
                          ? "bg-brand text-background"
                          : "text-muted-foreground",
                      )}
                    >
                      {(item.whiteList ?? "0") === "1" ? "是" : "否"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.createTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditItem(item)}
                      aria-label="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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
            onValueChange={(v) => { setSize(Number(v)); setCurrent(1); }}
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
              <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
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

      {/* 编辑对话框 */}
      <ApiPathEditDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        item={editItem}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

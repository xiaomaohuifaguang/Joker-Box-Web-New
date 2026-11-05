"use client";

import { useEffect, useState } from "react";
import { Pencil, RotateCcw, Search } from "lucide-react";
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
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

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
      <h1 className="text-page-title font-semibold">API 管理</h1>

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
              <TableHead>名称</TableHead>
              <TableHead>路径</TableHead>
              <TableHead>服务</TableHead>
              <TableHead>分组</TableHead>
              <TableHead>白名单</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
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
              <TableEmptyRow colSpan={7} title="暂无数据" />
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

"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRolePage } from "@/hooks/useRolePage";
import { deleteRole, destroyRole, queryRolePage } from "@/lib/api/roleManage";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { RoleRecord } from "@/types";
import { RoleFormDialog } from "./_components/RoleFormDialog";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

// 角色管理：列表 + 分页 + 搜索。行操作：编辑（配置 apiPath + 菜单权限）/ 删除（软删 / 强制删除）。
// 新增仅 name（可选复制源角色）；编辑走 /role/save（role + apiPathTree + menuChoose 前后台合并）。
export default function RoleManagerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [deleting, setDeleting] = useState<RoleRecord | null>(null);

  // 复制权限用的全量角色列表（页面级拉取一次，增删后刷新）。
  const [allRoles, setAllRoles] = useState<RoleRecord[]>([]);

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useRolePage({
    search,
    current,
    size,
    refreshKey,
  });

  // 拉取全量角色（复制权限选择器用）。
  useEffect(() => {
    queryRolePage({ current: 1, size: 1000 })
      .then((p) => setAllRoles(p?.records ?? []))
      .catch(() => setAllRoles([]));
  }, [refreshKey]);

  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(role: RoleRecord) {
    setEditing(role);
    setFormOpen(true);
  }
  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteRole(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      handleMutated();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? `${err.message}（可改用强制删除）`
          : "删除失败，角色可能仍有绑定",
      );
    }
  }
  async function confirmDestroy() {
    if (!deleting) return;
    try {
      await destroyRole(deleting.id);
      toast.success("已强制删除");
      setDeleting(null);
      handleMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "强制删除失败");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-page-title font-semibold">角色管理</h1>
        <Button onClick={openAdd} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增角色
        </Button>
      </div>

      {/* 搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索角色名称"
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
              <TableHead>角色</TableHead>
              <TableHead>后台管理</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="w-24 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={4} title="暂无角色" />
            ) : (
              records.map((role) => (
                <TableRow key={role.id} className="group">
                  <TableCell className="text-sm font-medium">{role.name}</TableCell>
                  <TableCell>
                    {role.admin === "1" ? (
                      <Badge className="bg-brand text-background">后台管理</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {role.updateTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(role)}
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(role)}
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

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        roles={allRoles}
        onSuccess={handleMutated}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              普通删除：若角色已绑定用户 / 菜单 / api 会失败。强制删除：级联删除所有绑定，不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
            <AlertDialogAction
              onClick={confirmDestroy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              强制删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

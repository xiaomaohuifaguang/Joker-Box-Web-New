"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useWebsitePage } from "@/hooks/useWebsitePage";
import { deleteWebsite } from "@/lib/api/websiteManage";
import { getWebsiteGroups } from "@/lib/api/website";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { WebsiteGroup, WebsiteRecord } from "@/types";
import { WebsiteFormDialog } from "./_components/WebsiteFormDialog";

const PAGE_SIZES = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// 地址归一化为可点击 href（无协议补 https://）。
function toHref(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

// 网站收藏管理：扁平列表 + 分页 + 筛选（search + groupName）。
// 分组无实体（groupName 是网站字段），分组筛选用 /website/group 派生的分组列表 + 计数。
// 签名：地址列渲染为可点击外链（mono + 外链图标）。
export default function WebsiteManagerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteRecord | null>(null);
  const [deleting, setDeleting] = useState<WebsiteRecord | null>(null);

  // 分组列表（筛选 Select + 计数用），增删后刷新。
  const [groups, setGroups] = useState<WebsiteGroup[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useWebsitePage({
    search,
    groupName,
    current,
    size,
    refreshKey,
  });

  useEffect(() => {
    getWebsiteGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [refreshKey]);

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(record: WebsiteRecord) {
    setEditing(record);
    setFormOpen(true);
  }
  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteWebsite(deleting.id);
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
    setGroupName("");
    setCurrent(1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">网址收藏</h1>
        <Button onClick={openAdd} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增收藏
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索标题/地址"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Select
          value={groupName || "__all"}
          onValueChange={(v) => {
            setGroupName(v === "__all" ? "" : v);
            setCurrent(1);
          }}
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="全部分组" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">全部分组</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.groupName} value={g.groupName}>
                {g.groupName}（{g.child.length}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <TableHead className="text-xs font-medium text-muted-foreground">标题</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">地址</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">分组</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">简介</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">更新时间</TableHead>
              <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j} className={j === 3 || j === 4 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-40 text-center text-sm text-muted-foreground">
                  暂无收藏
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="group">
                  <TableCell className="text-sm font-medium">{record.title}</TableCell>
                  <TableCell>
                    <a
                      href={toHref(record.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
                    >
                      <span className="max-w-[14rem] truncate">{record.url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.groupName}</Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-48 truncate text-xs text-muted-foreground lg:table-cell">
                    {record.description || "-"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                    {record.updateTime}
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

      <WebsiteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSuccess={handleMutated}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.title}」？</AlertDialogTitle>
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

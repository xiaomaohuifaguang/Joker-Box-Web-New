"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAiModelPage } from "@/hooks/useAiModelPage";
import { removeAiModel, setDefaultModel } from "@/lib/api/aiModel";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import type { AiModel, AiModelType } from "@/types";
import { AI_MODEL_TYPE_LABELS } from "@/types";
import { AiModelFormDialog } from "./_components/AiModelFormDialog";

const PAGE_SIZES = [10, 20, 50];

// 类型 tab：__all=全部（分页不传 type），其余按枚举值筛选。
// Radix ToggleGroup 空串 value 有歧义（点击已选项会回传 ""），故「全部」用哨兵 __all。
type TypeTab = AiModelType | "__all";
const TYPE_TABS: { value: TypeTab; label: string }[] = [
  { value: "__all", label: "全部" },
  { value: "CHAT", label: AI_MODEL_TYPE_LABELS.CHAT },
  { value: "EMBEDDING", label: AI_MODEL_TYPE_LABELS.EMBEDDING },
];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// AI 模型管理：扁平列表 + 分页 + 搜索。CRUD：新增/编辑（AiModelFormDialog，编辑走 info 回填）、
// 删除（AlertDialog 二次确认）。无分组/树。
export default function ModelManagerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeTab>("__all");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiModel | null>(null);
  const [deleting, setDeleting] = useState<AiModel | null>(null);
  const [settingDefault, setSettingDefault] = useState<AiModel | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, defaults, loading } = useAiModelPage({
    search,
    type: type === "__all" ? "" : type,
    current,
    size,
    refreshKey,
  });

  // 唯一权威派生：该行是否其类型的默认模型（不存行内冗余标志）。
  function isDefault(r: AiModel): boolean {
    return defaults?.[r.type]?.id === r.id;
  }

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(record: AiModel) {
    setEditing(record);
    setFormOpen(true);
  }
  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeAiModel(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      handleMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  async function confirmSetDefault() {
    if (!settingDefault) return;
    try {
      await setDefaultModel(settingDefault.type, settingDefault.id);
      toast.success("已设为默认");
      setSettingDefault(null);
      handleMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "设置默认失败");
    }
  }

  function reset() {
    setSearchInput("");
    setSearch("");
    setType("__all");
    setCurrent(1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">模型管理</h1>
        {/* 类型分段：全部 / 对话模型 / 向量模型 */}
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => {
            if (!v) return; // 点击已选项回传 ""，忽略以保持单选
            setType(v as TypeTab);
            setCurrent(1);
          }}
          className="rounded-lg border bg-surface p-0.5"
        >
          {TYPE_TABS.map((t) => (
            <ToggleGroupItem
              key={t.value}
              value={t.value}
              className="h-7 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              {t.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button onClick={openAdd} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增模型
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索名称/模型"
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
              <TableHead className="text-xs font-medium text-muted-foreground">模型</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">类型</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">描述</TableHead>
              <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j} className={j === 3 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-40 text-center text-sm text-muted-foreground">
                  暂无模型
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="group">
                  <TableCell className="text-sm font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {record.name}
                      {isDefault(record) && (
                        <Badge variant="secondary">
                          {AI_MODEL_TYPE_LABELS[record.type]}默认
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{record.model}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {AI_MODEL_TYPE_LABELS[record.type] ?? record.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground lg:table-cell">
                    {record.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      {!isDefault(record) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSettingDefault(record)}
                          aria-label="设为默认"
                          title="设为默认"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
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

      <AiModelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSuccess={handleMutated}
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

      <AlertDialog
        open={!!settingDefault}
        onOpenChange={(o) => !o && setSettingDefault(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              设为{settingDefault ? AI_MODEL_TYPE_LABELS[settingDefault.type] : ""}默认
            </AlertDialogTitle>
            <AlertDialogDescription>
              将「{settingDefault?.name}」设为
              {settingDefault ? AI_MODEL_TYPE_LABELS[settingDefault.type] : ""}
              默认？同类型当前默认将被替换。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSetDefault}>
              设为默认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

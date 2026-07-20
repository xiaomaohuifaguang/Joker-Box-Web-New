"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  FolderPlus,
  LayoutGrid,
  List,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
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
import { useFileList } from "@/hooks/useFileList";
import {
  createFolder,
  deleteFile,
  downloadFile,
  renameFile,
  uploadFile,
} from "@/lib/api/file";
import { ApiError } from "@/lib/api";
import type { FileItem } from "@/types";
import { FileCard } from "./_components/FileCard";
import { FileRow } from "./_components/FileRow";
import { NameDialog } from "./_components/NameDialog";

type ViewMode = "card" | "list";
type SortKey = "name" | "size" | "time";

// 码头（云盘）：需登录。面包屑导航 + 双视图(卡片/列表) + 排序 + 拖拽上传 + 右键菜单。
export default function FileServerPage() {
  return (
    <RequireAuth>
      <FileServer />
    </RequireAuth>
  );
}

function FileServer() {
  const [path, setPath] = useState<{ id: string; name: string }[]>([
    { id: "0", name: "码头" },
  ]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [folderOpen, setFolderOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<FileItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<FileItem | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const currentId = path[path.length - 1].id;
  const currentName = path[path.length - 1].name;
  const { items, loading } = useFileList(currentId, refreshKey);

  // 文件夹始终置顶；组内按 sortKey/sortDir 排序。字段可能为 null，兜底防崩。
  const sorted = [...(items ?? [])].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    let cmp = 0;
    if (sortKey === "name")
      cmp = (a.filename ?? "").localeCompare(b.filename ?? "");
    else if (sortKey === "size") cmp = (a.size ?? 0) - (b.size ?? 0);
    else cmp = (a.updateTime ?? "").localeCompare(b.updateTime ?? "");
    return sortDir === "asc" ? cmp : -cmp;
  });

  function openFolder(folder: FileItem) {
    setPath((p) => [...p, { id: folder.id, name: folder.filename }]);
  }
  function navigateTo(i: number) {
    setPath((p) => p.slice(0, i + 1));
  }
  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;
    for (const f of files) {
      try {
        await uploadFile(f, currentId);
        ok++;
      } catch {
        fail++;
      }
    }
    setUploading(false);
    refresh();
    if (fail === 0) toast.success(`已上传 ${ok} 个文件`);
    else toast.error(`上传完成：成功 ${ok}，失败 ${fail}`);
  }
  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    void uploadFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  }
  function handleDragLeave(e: DragEvent) {
    // 只在离开容器（而非进入子元素）时收起浮层
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOver(false);
    }
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void uploadFiles(Array.from(e.dataTransfer.files ?? []));
  }

  async function doCreateFolder(name: string) {
    await createFolder(currentId, name);
    toast.success("文件夹已创建");
    refresh();
  }
  async function doRename(name: string) {
    if (!renameItem) return;
    await renameFile(renameItem.id, name);
    toast.success("已重命名");
    refresh();
  }
  async function doDelete() {
    if (!deleteItem) return;
    try {
      await deleteFile(deleteItem.id);
      toast.success("已删除");
      setDeleteItem(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }
  async function handleDownload(item: FileItem) {
    try {
      await downloadFile(item.id, item.filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "下载失败");
    }
  }

  const itemHandlers = (item: FileItem) => ({
    onOpen: () => openFolder(item),
    onRename: () => setRenameItem(item),
    onDelete: () => setDeleteItem(item),
    onDownload: () => handleDownload(item),
  });

  return (
    <Container className="py-8 md:py-12">
      {/* 标题 + 面包屑 + 上传/新建 */}
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold">码头</h1>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-sm">
          {path.map((p, i) => (
            <span key={p.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                type="button"
                onClick={() => navigateTo(i)}
                className={
                  i === path.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {p.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "上传中…" : "上传"}
          </Button>
          <Button size="sm" onClick={() => setFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            新建文件夹
          </Button>
        </div>
      </header>

      {/* 工具栏：排序 + 视图切换 + 计数 */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Select
          value={sortKey}
          onValueChange={(v) => setSortKey(v as SortKey)}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">名称</SelectItem>
            <SelectItem value="size">大小</SelectItem>
            <SelectItem value="time">修改时间</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          aria-label="切换排序方向"
        >
          {sortDir === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </Button>
        <span className="ml-1">
          {items?.length ?? 0} 项
        </span>
        <div className="ml-auto flex items-center overflow-hidden rounded-md border">
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setViewMode("card")}
            aria-label="卡片视图"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setViewMode("list")}
            aria-label="列表视图"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区（空白区右键 -> 上传/新建；支持拖拽上传）*/}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="relative min-h-[40vh] rounded-lg border bg-surface/40 p-3"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {loading ? (
              viewMode === "card" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              )
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-20 text-center text-sm text-muted-foreground">
                <p>空空如也。</p>
                <p>上传文件、新建文件夹，或直接把文件拖进来。</p>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {sorted.map((item) => (
                  <FileCard key={item.id} item={item} {...itemHandlers(item)} />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">名称</TableHead>
                    <TableHead className="w-28 text-xs">大小</TableHead>
                    <TableHead className="w-44 text-xs">修改时间</TableHead>
                    <TableHead className="w-24 text-right text-xs">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((item) => (
                    <FileRow key={item.id} item={item} {...itemHandlers(item)} />
                  ))}
                </TableBody>
              </Table>
            )}

            {/* 拖拽上传浮层 */}
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-brand bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1 text-brand">
                  <Upload className="h-8 w-8" />
                  <p className="font-display text-lg font-semibold">
                    释放以上传到「{currentName}」
                  </p>
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => uploadInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            上传
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            新建文件夹
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 新建文件夹 */}
      <NameDialog
        open={folderOpen}
        onOpenChange={setFolderOpen}
        title="新建文件夹"
        initialValue=""
        confirmText="创建"
        onConfirm={doCreateFolder}
      />
      {/* 重命名 */}
      <NameDialog
        open={!!renameItem}
        onOpenChange={(o) => !o && setRenameItem(null)}
        title="重命名"
        initialValue={renameItem?.filename ?? ""}
        confirmText="保存"
        onConfirm={doRename}
      />

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{deleteItem?.filename}」
              {deleteItem?.type === "folder" ? "及其内容" : ""}，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}

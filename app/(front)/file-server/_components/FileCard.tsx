"use client";

import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  Pencil,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import type { FileItem } from "@/types";
import { FileMenuItems } from "./FileMenuItems";

// 按 type/contentType 选图标。
export function iconFor(item: FileItem): LucideIcon {
  if (item.type === "folder") return Folder;
  const ct = item.contentType;
  if (ct.startsWith("image/")) return FileImage;
  if (ct.includes("pdf")) return FileText;
  if (
    ct.includes("zip") ||
    ct.includes("compressed") ||
    ct.includes("tar") ||
    ct.includes("rar") ||
    ct.includes("7z")
  )
    return FileArchive;
  if (ct.startsWith("video/")) return FileVideo;
  if (ct.startsWith("audio/")) return FileAudio;
  if (
    ct.startsWith("text/") ||
    ct.includes("json") ||
    ct.includes("xml") ||
    ct.includes("javascript")
  )
    return FileText;
  return File;
}

// 格式化字节数。
export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 卡片视图：点文件夹进入/点文件下载；hover 出操作；右键出菜单。
export function FileCard({
  item,
  onOpen,
  onRename,
  onDelete,
  onDownload,
}: {
  item: FileItem;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const Icon = iconFor(item);
  const isFolder = item.type === "folder";
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group relative flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all hover:border-brand hover:shadow-sm">
          <button
            type="button"
            onClick={isFolder ? onOpen : onDownload}
            className="flex w-full flex-col items-center gap-2"
          >
            <Icon
              className={`h-9 w-9 ${isFolder ? "text-felt" : "text-muted-foreground"}`}
            />
            <span className="line-clamp-2 break-all text-xs font-medium">
              {item.filename}
            </span>
          </button>
          <span className="text-[10px] text-muted-foreground">
            {isFolder ? "文件夹" : formatBytes(item.size)}
          </span>
          <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-background/80 p-0.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRename}
              aria-label="重命名"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {!isFolder && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDownload}
                aria-label="下载"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={onDelete}
              aria-label="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>
      <FileMenuItems
        item={item}
        onOpen={onOpen}
        onRename={onRename}
        onDelete={onDelete}
        onDownload={onDownload}
      />
    </ContextMenu>
  );
}

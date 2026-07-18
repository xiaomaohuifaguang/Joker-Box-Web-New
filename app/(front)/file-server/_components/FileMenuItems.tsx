"use client";

import { Download, FolderOpen, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import type { FileItem } from "@/types";

// 文件/文件夹右键菜单内容：文件夹=打开，文件=下载；都含重命名/删除。
export function FileMenuItems({
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
  return (
    <ContextMenuContent>
      {item.type === "folder" ? (
        <ContextMenuItem onClick={onOpen}>
          <FolderOpen className="h-4 w-4" />
          打开
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={onDownload}>
          <Download className="h-4 w-4" />
          下载
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={onRename}>
        <Pencil className="h-4 w-4" />
        重命名
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={onDelete}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        删除
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

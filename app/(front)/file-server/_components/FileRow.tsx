"use client";

import { Download, Pencil, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { FileItem } from "@/types";
import { FileMenuItems } from "./FileMenuItems";
import { formatBytes, iconFor } from "./FileCard";

// 列表视图行：点名称打开/下载；hover 出操作；右键出菜单。
export function FileRow({
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
        <TableRow className="group">
          <TableCell>
            <button
              type="button"
              onClick={isFolder ? onOpen : onDownload}
              className="flex items-center gap-2 text-left"
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isFolder ? "text-felt" : "text-muted-foreground"}`}
              />
              <span className="truncate font-medium">{item.filename}</span>
            </button>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {isFolder ? "—" : formatBytes(item.size)}
          </TableCell>
          <TableCell className="font-mono text-xs text-muted-foreground">
            {item.updateTime}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRename}
                aria-label="重命名"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              {!isFolder && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onDownload}
                  aria-label="下载"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={onDelete}
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
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

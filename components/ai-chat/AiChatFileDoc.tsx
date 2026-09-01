"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadChatFile } from "@/lib/api/aiChat";
import { ApiError } from "@/lib/api";
import type { ChatFileInfo } from "@/types";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// 消息气泡里的「文件」附件（pdf/office 文档，非图片）：图标 + 文件名 + 大小，点击下载。
// 图片附件走 AiChatFileThumb（内联缩略图），不走这里。
export function AiChatFileDoc({ file }: { file: ChatFileInfo }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadChatFile(file.id, file.filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      title={`${file.filename}（点击下载）`}
      className="flex max-w-full items-center gap-2 rounded-md border bg-background/20 px-2.5 py-1.5 text-left transition-opacity hover:opacity-80"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs leading-tight">
          {file.filename}
        </span>
        <span className="block text-[10px] leading-tight opacity-70">
          {formatSize(file.size)}
        </span>
      </span>
    </button>
  );
}

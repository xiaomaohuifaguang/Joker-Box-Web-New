"use client";

import { useEffect, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadChatFile, getChatFileObjectUrl } from "@/lib/api/aiChat";
import { ApiError } from "@/lib/api";
import type { ChatFileInfo } from "@/types";

// 消息气泡里的图片附件缩略图。fileDownload 需带 Authorization 头，<img> 直链发不了，
// 只能 fetch blob → objectURL；模块级缓存按 fileId 复用（会话内不重复拉，widget 常驻不泄露）。
// 点击下载原图（downloadChatFile，文件名取 messages 的 filename）。
const urlCache = new Map<string, string>();

export function AiChatFileThumb({ file }: { file: ChatFileInfo }) {
  const [url, setUrl] = useState<string | null>(
    () => urlCache.get(file.id) ?? null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url || failed) return;
    let cancelled = false;
    getChatFileObjectUrl(file.id)
      .then((u) => {
        if (cancelled) return;
        urlCache.set(file.id, u);
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, url, failed]);

  async function download() {
    try {
      await downloadChatFile(file.id, file.filename);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "下载失败");
    }
  }

  if (failed) {
    return (
      <div
        className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border bg-background/20 p-1 text-[10px]"
        title={file.filename}
      >
        <FileWarning className="h-4 w-4" />
        <span className="w-full truncate text-center">{file.filename}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <Skeleton className="flex h-20 w-20 items-center justify-center rounded-md bg-background/20">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Skeleton>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      className="block overflow-hidden rounded-md border bg-background/20 transition-opacity hover:opacity-80"
      title={`${file.filename}（点击下载）`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob objectURL，不走 next/image */}
      <img src={url} alt={file.filename} className="h-20 w-20 object-cover" />
    </button>
  );
}

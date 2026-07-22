"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { ApiError } from "@/lib/api";
import { downloadDynamicFormFile, uploadDynamicFormFile } from "@/lib/api/dynamicFormFile";
import { cn } from "@/lib/utils";
import type { FileInfo } from "@/types";
import type { FieldControlProps } from "./registry";

// UPLOAD 控件：上传块（虚线点击/拖拽区，占满 span 宽）+ 附件网格（sm 起两列多排）。
// 值存 FileInfo（单）/ FileInfo[]（多，max 控数量）。类型/大小限制由后端接口统一控制。
export function UploadControl({ field, value, onChange, disabled }: FieldControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const max = field.max ?? 1;
  const files: FileInfo[] = Array.isArray(value)
    ? (value as FileInfo[])
    : value && typeof value === "object" && "id" in (value as FileInfo)
      ? [value as FileInfo]
      : [];
  const canAdd = files.length < max;

  async function uploadFiles(picked: File[]) {
    if (!picked.length) return;
    const room = max - files.length;
    const toUpload = picked.slice(0, room);
    if (picked.length > room) toast.error(`最多上传 ${max} 个文件`);
    if (!toUpload.length) return;
    setUploading(true);
    try {
      const uploaded: FileInfo[] = [];
      for (const f of toUpload) uploaded.push(await uploadDynamicFormFile(f));
      const next = [...files, ...uploaded];
      onChange(max === 1 ? next[0] : next);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    void uploadFiles(picked);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || !canAdd || uploading) return;
    void uploadFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function remove(id: string) {
    const next = files.filter((f) => f.id !== id);
    onChange(max === 1 ? (next[0] ?? null) : next);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {/* 上传块 */}
      {!disabled && canAdd && (
        <>
          <input ref={inputRef} type="file" multiple={max > 1} className="hidden" onChange={onPick} />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-4 text-muted-foreground transition-colors",
              dragOver ? "border-brand bg-accent" : "hover:border-brand/60 hover:bg-accent/50",
              uploading && "pointer-events-none opacity-70",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
            <span className="text-xs">
              {uploading
                ? "上传中…"
                : max > 1
                  ? `点击或拖拽上传（${files.length}/${max}）`
                  : "点击或拖拽上传文件"}
            </span>
          </button>
        </>
      )}

      {/* 附件网格：一列，sm 起两列多排 */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex min-w-0 items-center gap-1.5 rounded-md border bg-background py-1.5 pl-2 pr-1 text-xs"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              <button
                type="button"
                title={`下载 ${f.filename || f.id}`}
                onClick={() =>
                  downloadDynamicFormFile(f.id, f.filename || f.id).catch(() => toast.error("下载失败"))
                }
                className="min-w-0 flex-1 truncate text-left hover:text-brand hover:underline"
              >
                {f.filename || f.id}
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  aria-label="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

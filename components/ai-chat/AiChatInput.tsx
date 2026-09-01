"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Plus,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { uploadChatFile } from "@/lib/api/aiChat";
import { ApiError } from "@/lib/api";
import { cn, randomId } from "@/lib/utils";
import type { ChatFileInfo } from "@/types";

// 附件约束（前端兜底，后端无约束）：最多 5 个、每个 ≤10MB。
// 图片（需 vision 模型）：JPEG/PNG/GIF/WebP；文件（任意模型）：pdf/office 文档。
const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp";
const IMAGE_EXT = ["jpg", "jpeg", "png", "gif", "webp"];
const DOC_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";
const DOC_EXT = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"];
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;

type AttachmentKind = "image" | "doc";

/** 输入框待发附件：选中即上传（uploading），拿到 fileId 后 done，发送只带 id。 */
interface Attachment {
  key: string;
  kind: AttachmentKind;
  /** 保留原文件：失败后可直接重传（不必再选一次）。 */
  file: File;
  /** 本地预览 objectURL（仅图片；remove/发送后 revoke）。 */
  previewUrl?: string;
  fileName: string;
  status: "uploading" | "done" | "error";
  info?: ChatFileInfo;
}

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// 输入区：单张圆角作曲卡（textarea 无边框内嵌，发送钮嵌右下），Enter 发送 / Shift+Enter 换行。
// 流式中发送钮原位变停止钮（同圆槽，不跳动）。焦点环落在整张卡上（focus-within），而非字段本身。
// 左下「+」下拉：上传图片（仅 vision 模型，缩略图预览）/ 上传文件（任意模型，图标卡片）。
// 附件排在 textarea 上方，选中即传（fileUpload），发送只带 fileIds；有上传中/失败附件时禁发（失败项点击重试）。
export function AiChatInput({
  streaming, disabled, vision, onSend, onStop,
}: {
  streaming: boolean;
  disabled: boolean;
  /** 当前模型是否支持图像理解（false 时隐藏「上传图片」、移除已选图片；文件附件不受影响）。 */
  vision: boolean;
  onSend: (content: string, files?: ChatFileInfo[]) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // 切到无图像理解能力的模型：仅移除已选「图片」（文件附件不受模型限制，保留）。
  // render 期条件 setState，避开 set-state-in-effect。
  const [prevVision, setPrevVision] = useState(vision);
  if (prevVision !== vision) {
    setPrevVision(vision);
    if (!vision) {
      attachments
        .filter((a) => a.kind === "image")
        .forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      setAttachments((as) => as.filter((a) => a.kind !== "image"));
    }
  }

  const uploading = attachments.some((a) => a.status === "uploading");
  const hasError = attachments.some((a) => a.status === "error");
  const canSend =
    !disabled &&
    !streaming &&
    !uploading &&
    !hasError &&
    value.trim().length > 0;

  // 卸载兜底：revoke 所有本地预览 URL（remove/发送时已各自 revoke）。
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(
        (a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl),
      );
    };
  }, []);

  function patchAttachment(key: string, patch: Partial<Attachment>) {
    setAttachments((as) =>
      as.map((a) => (a.key === key ? { ...a, ...patch } : a)),
    );
  }

  function removeAttachment(key: string) {
    setAttachments((as) => {
      const target = as.find((a) => a.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return as.filter((a) => a.key !== key);
    });
  }

  function clearAttachments() {
    attachments.forEach(
      (a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl),
    );
    setAttachments([]);
  }

  function doUpload(key: string, file: File) {
    patchAttachment(key, { status: "uploading" });
    uploadChatFile(file)
      .then((info) => patchAttachment(key, { status: "done", info }))
      .catch((err) => {
        patchAttachment(key, { status: "error" });
        toast.error(
          err instanceof ApiError ? err.message : `「${file.name}」上传失败`,
        );
      });
  }

  function pickFiles(list: FileList | null, kind: AttachmentKind) {
    if (!list) return;
    const files = Array.from(list);
    if (attachments.length + files.length > MAX_FILES) {
      toast.error(`最多上传 ${MAX_FILES} 个附件`);
      return;
    }
    const allowed = kind === "image" ? IMAGE_EXT : DOC_EXT;
    const label =
      kind === "image"
        ? "JPEG/PNG/GIF/WebP"
        : "PDF/Word/PPT/Excel";
    for (const file of files) {
      // 用扩展名校验：doc/md/txt 的 MIME 在部分系统为空或不可靠。
      if (!allowed.includes(extOf(file.name))) {
        toast.error(`「${file.name}」格式不支持，仅限 ${label}`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`「${file.name}」超过 10MB 限制`);
        continue;
      }
      const key = randomId();
      const att: Attachment = {
        key,
        kind,
        file,
        previewUrl:
          kind === "image" ? URL.createObjectURL(file) : undefined,
        fileName: file.name,
        status: "uploading",
      };
      setAttachments((as) => [...as, att]);
      doUpload(key, file);
    }
  }

  function retry(key: string) {
    const att = attachments.find((a) => a.key === key);
    if (!att) return;
    doUpload(key, att.file);
  }

  function submit() {
    const t = value.trim();
    if (!t || !canSend) return;
    const files = attachments
      .map((a) => a.info)
      .filter((i): i is ChatFileInfo => !!i);
    onSend(t, files.length ? files : undefined);
    setValue("");
    clearAttachments();
  }

  return (
    <div className="p-3 pt-1">
      {/* 作曲卡：边框+底是一个整体；focus-within 把环落在卡上，内部 textarea 去边框去环。 */}
      <div
        className={cn(
          "rounded-xl border border-input bg-muted/40 shadow-xs transition-[box-shadow,border-color]",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "opacity-60",
        )}
      >
        {/* 附件排：图片缩略图 / 文件卡片；uploading 转圈遮罩，error 红罩点击重试，hover 浮 × 移除。 */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2.5">
            {attachments.map((a) => (
              <div
                key={a.key}
                className={cn(
                  "group/att relative overflow-hidden rounded-md border bg-background",
                  a.kind === "image"
                    ? "h-16 w-16"
                    : "flex h-16 w-36 flex-col items-center justify-center gap-1 p-1.5",
                )}
              >
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 本地 objectURL 预览
                  <img
                    src={a.previewUrl}
                    alt={a.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="w-full truncate text-center text-[10px] leading-tight">
                      {a.fileName}
                    </span>
                  </>
                )}
                {a.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {a.status === "error" && (
                  <button
                    type="button"
                    onClick={() => retry(a.key)}
                    className="absolute inset-0 flex items-center justify-center bg-destructive/70 text-[10px] text-destructive-foreground"
                    title="上传失败，点击重试"
                  >
                    重试
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(a.key)}
                  className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-foreground/70 text-background group-hover/att:flex"
                  aria-label={`移除 ${a.fileName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // IME 组合中（拼音选词）按 Enter 不发送。
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="输入消息…"
          disabled={disabled}
          className={cn(
            "max-h-40 min-h-11 resize-none border-0 bg-transparent px-3 pt-2.5 pb-1 text-sm shadow-none",
            "focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
          )}
        />
        {/* 卡内底行：左侧 +（附件）与键位提示，右侧圆形发送/停止钮。 */}
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground"
                  disabled={disabled || streaming}
                  aria-label="添加附件"
                  title="添加附件"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                {vision && (
                  <DropdownMenuItem
                    onSelect={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    上传图片
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => docInputRef.current?.click()}>
                  <FileUp className="h-4 w-4" />
                  上传文件
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* 两个隐藏 file input：图片/文件分开，各自 accept 限制类型。 */}
            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                pickFiles(e.target.files, "image");
                // 重置 value：允许连续选同一文件再次触发 change。
                e.target.value = "";
              }}
            />
            <input
              ref={docInputRef}
              type="file"
              accept={DOC_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                pickFiles(e.target.files, "doc");
                e.target.value = "";
              }}
            />
            <p className="select-none pl-0.5 text-[11px] leading-none text-muted-foreground/70 max-sm:hidden">
              <kbd className="font-sans">Enter</kbd> 发送 · <kbd className="font-sans">Shift+Enter</kbd> 换行
            </p>
          </div>
          {streaming ? (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={onStop}
              aria-label="停止"
              title="停止生成"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={submit}
              disabled={!canSend}
              aria-label="发送"
              title={
                uploading
                  ? "附件上传中…"
                  : hasError
                    ? "有附件上传失败，请重试或移除"
                    : "发送"
              }
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

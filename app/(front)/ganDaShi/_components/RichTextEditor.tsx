"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ResizableImage } from "./ResizableImage";
import { Extension, type Editor } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import {
  Bold,
  Code,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 暴露给父级：取 HTML / 纯文字 / 清空 / 聚焦。
export type RichTextEditorHandle = {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  focus: () => void;
};

const MAX_COMPRESSED_SIZE = 1_000_000; // 压缩后 base64 > 1MB 拒绝

// 文件 -> 压缩 base64 data URI：canvas 缩放（maxW）+ JPEG（quality）。
async function fileToCompressedDataURI(
  file: File,
  maxW = 1200,
  quality = 0.85,
): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;
  await img.decode();
  try {
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 不可用");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 从 DataTransfer 提取图片文件（粘贴/拖拽用）。
function getImages(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  const files: File[] = [];
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}

// 压缩 + 大小守卫 + 插入图片（base64）。工具栏按钮与粘贴/拖拽共用。
async function insertImageFile(file: File, editor: Editor) {
  try {
    const dataURI = await fileToCompressedDataURI(file);
    if (dataURI.length > MAX_COMPRESSED_SIZE) {
      toast.error("图片太大（压缩后 >1MB），请换小图");
      return;
    }
    editor.chain().focus().setImage({ src: dataURI, alt: file.name }).run();
  } catch {
    toast.error("图片处理失败");
  }
}

// 粘贴/拖拽自动上传扩展：拦截图片文件 -> 压缩 -> 插入。
const ImageUpload = Extension.create({
  name: "imageUpload",
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event: ClipboardEvent) => {
            const files = getImages(event.clipboardData);
            if (!files.length) return false;
            event.preventDefault();
            files.forEach((f) => void insertImageFile(f, editor));
            return true;
          },
          handleDrop: (_view, event: DragEvent) => {
            const files = getImages(event.dataTransfer);
            if (!files.length) return false;
            event.preventDefault();
            files.forEach((f) => void insertImageFile(f, editor));
            return true;
          },
        },
      }),
    ];
  },
});

// 工具栏按钮：onMouseDown preventDefault 防编辑器失焦。
function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-foreground")}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

// TipTap 富文本编辑器。compact=true（评论用）只留粗体/斜体/链接/图片；false（帖子用）全功能。
// 图片：base64 内联（客户端 canvas 压缩 maxW=1200 JPEG 0.85，>1MB 拒绝）。
// 粘贴/拖拽图片自动压缩插入。immediatelyRender: false 规避静态导出 SSR 水合告警。
export const RichTextEditor = forwardRef<
  RichTextEditorHandle,
  { placeholder?: string; compact?: boolean }
>(function RichTextEditor({ placeholder = "写点什么...", compact }, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-brand underline" },
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({ placeholder }),
      ImageUpload,
    ],
    content: "",
    immediatelyRender: false,
  });

  useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editor?.getHTML() ?? "",
      getText: () => editor?.getText() ?? "",
      clear: () => editor?.commands.clearContent(),
      focus: () => editor?.commands.focus(),
    }),
    [editor],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (editor) files.forEach((f) => void insertImageFile(f, editor));
    e.target.value = ""; // 允许重复选同一文件
  }

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="粗体"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="斜体"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = prompt("链接地址");
            if (url)
              editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          label="链接"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          active={editor.isActive("image")}
          label="图片"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        {!compact && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              label="删除线"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive("heading", { level: 2 })}
              label="标题"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              label="无序列表"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              label="有序列表"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              label="代码块"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              label="引用"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
      </div>
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert max-w-none p-3 prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto"
      />
    </div>
  );
});

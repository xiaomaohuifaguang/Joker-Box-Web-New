"use client";

import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 暴露给父级：取 HTML / 纯文字 / 清空 / 聚焦。
export type RichTextEditorHandle = {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  focus: () => void;
};

// 工具栏按钮：onMouseDown preventDefault 防编辑器失焦（格式化才能作用到选区）。
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

// TipTap 富文本编辑器。compact=true（评论用）只留粗体/斜体/链接；false（帖子用）全功能。
// immediatelyRender: false 规避静态导出 SSR 水合告警。
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
      Placeholder.configure({ placeholder }),
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

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background">
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
          onClick={() => editor.chain().focus().toggleLink({ href: prompt("链接地址") ?? "" }).run()}
          active={editor.isActive("link")}
          label="链接"
        >
          <LinkIcon className="h-4 w-4" />
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
        className="prose dark:prose-invert max-w-none p-3"
      />
    </div>
  );
});

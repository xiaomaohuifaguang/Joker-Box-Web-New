"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { addPost } from "@/lib/api/ganDaShi";
import { ApiError } from "@/lib/api";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";

// 发帖：标题 + TipTap 富文本编辑器。提交 addPost { title, content(HTML), text(纯文字) }。
export function NewPost({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const editorRef = useRef<RichTextEditorHandle>(null);

  async function submit() {
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }
    const content = editorRef.current?.getHTML() ?? "";
    const text = editorRef.current?.getText() ?? "";
    if (!text.trim()) {
      toast.error("请输入内容");
      return;
    }
    setBusy(true);
    try {
      await addPost({ title: title.trim(), content, text });
      toast.success("已发布");
      onBack();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "发布失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-8 md:py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4 text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <h1 className="font-display mb-6 text-2xl font-semibold">发帖</h1>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>标题</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话讲清楚你要干的大事"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>内容</Label>
          <RichTextEditor ref={editorRef} placeholder="写点什么..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onBack}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "发布中…" : "发布"}
          </Button>
        </div>
      </div>
    </Container>
  );
}

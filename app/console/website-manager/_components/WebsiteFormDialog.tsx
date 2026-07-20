"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addWebsite, saveWebsite } from "@/lib/api/websiteManage";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WebsiteRecord } from "@/types";

type FormState = {
  groupName: string;
  url: string;
  title: string;
  description: string;
};

const EMPTY: FormState = { groupName: "默认", url: "", title: "", description: "" };

// 新增 / 编辑收藏网站。editing 非 null 时为编辑。
// 新增走 /website/add（无 id）；编辑走 /website/save（含 id）。groupName 自由文本（默认"默认"）。
export function WebsiteFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WebsiteRecord | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      setForm(
        editing
          ? {
              groupName: editing.groupName,
              url: editing.url,
              title: editing.title,
              description: editing.description,
            }
          : EMPTY,
      );
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.url.trim()) {
      toast.error("请输入地址");
      return;
    }
    if (!form.title.trim()) {
      toast.error("请输入标题");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        groupName: form.groupName.trim() || "默认",
        url: form.url.trim(),
        title: form.title.trim(),
        description: form.description,
      };
      if (editing) {
        await saveWebsite({ id: editing.id, ...payload });
        toast.success("已保存");
      } else {
        await addWebsite(payload);
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑收藏" : "新增收藏"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改收藏网站。" : "新建一个收藏网站。"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3">
            <Label className="text-sm text-muted-foreground">分组</Label>
            <Input
              value={form.groupName}
              onChange={(e) => set("groupName", e.target.value)}
              placeholder="默认"
            />
            <Label className="text-sm text-muted-foreground">地址</Label>
            <Input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com"
              className="font-mono text-sm"
            />
            <Label className="text-sm text-muted-foreground">标题</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="如 GitHub"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">简介</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="一句话描述（可选）"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

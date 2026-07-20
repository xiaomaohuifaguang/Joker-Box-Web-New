"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addCodeTable, updateCodeTable } from "@/lib/api/codeTable";
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
import { Switch } from "@/components/ui/switch";
import type { CodeTable } from "@/types";

type FormState = {
  code: string;
  name: string;
  tree: string;
  status: string;
  remark: string;
};

const EMPTY: FormState = { code: "", name: "", tree: "0", status: "1", remark: "" };

// 新增 / 编辑码表（字典定义）。editing 非 null 时为编辑。
// 新增走 /code-table/add（无 id）；编辑走 /code-table/update（含 id）。
export function CodeTableFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CodeTable | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  // 打开/换码表时回填（render 期内条件 setState）。
  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      setForm(
        editing
          ? {
              code: editing.code,
              name: editing.name,
              tree: editing.tree,
              status: editing.status,
              remark: editing.remark,
            }
          : EMPTY,
      );
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.code.trim()) {
      toast.error("请输入编码");
      return;
    }
    if (!form.name.trim()) {
      toast.error("请输入名称");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateCodeTable({ id: editing.id, ...form });
        toast.success("已保存");
      } else {
        await addCodeTable(form);
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
          <DialogTitle>{editing ? "编辑码表" : "新增码表"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改码表定义。" : "新建一个码表（字典）。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3">
          <Label className="text-sm text-muted-foreground">编码</Label>
          <Input
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="如 gender"
            className="font-mono text-sm"
          />
          <Label className="text-sm text-muted-foreground">名称</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="如 性别"
          />
          <Label className="text-sm text-muted-foreground">树形</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.tree === "1"}
              onCheckedChange={(c) => set("tree", c ? "1" : "0")}
            />
            <span className="text-xs text-muted-foreground">
              树形码表的项可分层级
            </span>
          </div>
          <Label className="text-sm text-muted-foreground">状态</Label>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.status === "1"}
              onCheckedChange={(c) => set("status", c ? "1" : "0")}
            />
            <span className="text-xs text-muted-foreground">
              {form.status === "1" ? "启用" : "停用"}
            </span>
          </div>
          <Label className="text-sm text-muted-foreground">备注</Label>
          <Input
            value={form.remark}
            onChange={(e) => set("remark", e.target.value)}
          />
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

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addCodeItem, updateCodeItem } from "@/lib/api/codeTable";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CodeItem } from "@/types";

type FormState = {
  label: string;
  value: string;
  parentId: string;
  sort: number;
  status: string;
  remark: string;
};

const EMPTY: FormState = {
  label: "",
  value: "",
  parentId: "",
  sort: 0,
  status: "1",
  remark: "",
};

// 扁平化码表项树为 Select 选项（全角空格缩进表示层级）。
function flattenCodeItems(
  nodes: CodeItem[],
  depth = 0,
  acc: { id: string; label: string }[] = [],
): { id: string; label: string }[] {
  for (const n of nodes) {
    acc.push({ id: n.id, label: `${"　".repeat(depth)}${n.label}` });
    if (n.children?.length) flattenCodeItems(n.children, depth + 1, acc);
  }
  return acc;
}

function findCodeItem(nodes: CodeItem[], id: string): CodeItem | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const r = findCodeItem(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

// 收集 node 子树所有 id（含自身），用于编辑时排除自身及子孙作为父级（防环）。
function collectSubtreeIds(node: CodeItem, acc = new Set<string>()): Set<string> {
  acc.add(node.id);
  if (node.children) for (const c of node.children) collectSubtreeIds(c, acc);
  return acc;
}

// 新增 / 编辑码表项。editing 非 null 时为编辑。
// isTree=true 时显示父级选择（排除自身及子孙防环）；扁平码表无父级。
// 新增走 /code-item/add（无 id）；编辑走 /code-item/update（含 id）。拖拽排序/改挂在表格外用 /code-item/update。
export function CodeItemFormDialog({
  open,
  onOpenChange,
  tableId,
  isTree,
  editing,
  defaultParentId,
  nodes,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  isTree: boolean;
  editing: CodeItem | null;
  defaultParentId: string;
  nodes: CodeItem[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

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
              label: editing.label,
              value: editing.value,
              parentId: editing.parentId,
              sort: editing.sort,
              status: editing.status,
              remark: editing.remark,
            }
          : { ...EMPTY, parentId: defaultParentId },
      );
    }
  }

  // 父级选项：扁平化树，排除自身及子孙（防环）。
  const selfNode = editing ? findCodeItem(nodes, editing.id) : null;
  const excludeIds = selfNode ? collectSubtreeIds(selfNode) : new Set<string>();
  const parentOptions = flattenCodeItems(nodes).filter(
    (o) => !excludeIds.has(o.id),
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.label.trim()) {
      toast.error("请输入标签");
      return;
    }
    if (!form.value.trim()) {
      toast.error("请输入值");
      return;
    }
    setBusy(true);
    try {
      const base = {
        tableId,
        parentId: isTree ? form.parentId : "",
        label: form.label.trim(),
        value: form.value.trim(),
        sort: form.sort,
        status: form.status,
        remark: form.remark,
      };
      if (editing) {
        await updateCodeItem({ id: editing.id, ...base });
        toast.success("已保存");
      } else {
        await addCodeItem(base);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑码表项" : "新增码表项"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改码表项。" : "新建一个码表项。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-3">
          <Label className="text-sm text-muted-foreground">标签</Label>
          <Input
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            placeholder="如 男"
          />
          <Label className="text-sm text-muted-foreground">值</Label>
          <Input
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder="如 M"
            className="font-mono text-sm"
          />
          {isTree && (
            <>
              <Label className="text-sm text-muted-foreground">父级</Label>
              <Select
                value={form.parentId || "__root"}
                onValueChange={(v) =>
                  set("parentId", v === "__root" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="（顶级）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root">（顶级）</SelectItem>
                  {parentOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Label className="text-sm text-muted-foreground">排序</Label>
          <Input
            type="number"
            value={form.sort}
            onChange={(e) => set("sort", Number(e.target.value))}
            className="w-28"
          />
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

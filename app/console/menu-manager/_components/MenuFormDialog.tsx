"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addMenu, getMenuApiPathTree, saveMenuWithApi } from "@/lib/api/menuManage";
import { ApiError } from "@/lib/api";
import { apiPathKey, menuTypeLabel } from "@/types";
import type { MenuApiPathServer, MenuNode } from "@/types";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPicker } from "./IconPicker";
import { ApiPathBindingTree } from "@/components/ApiPathBindingTree";
import { buildApiPathSaveTree } from "@/lib/apiPathTree";

// 扁平化菜单树为 Select 选项（全角空格缩进表示层级），excludeIds 中的节点及其子树跳过。
function flattenMenuOptions(
  nodes: MenuNode[],
  depth = 0,
  acc: { id: number; label: string }[] = [],
  excludeIds: Set<number> = new Set(),
): { id: number; label: string }[] {
  for (const n of nodes) {
    if (excludeIds.has(n.id)) continue;
    acc.push({ id: n.id, label: `${"　".repeat(depth)}${n.name}` });
    if (n.children?.length)
      flattenMenuOptions(n.children, depth + 1, acc, excludeIds);
  }
  return acc;
}

// 收集 node 子树所有 id（含自身），用于编辑时排除自身及子孙作为父级（防环）。
function collectSubtreeIds(node: MenuNode, acc = new Set<number>()): Set<number> {
  acc.add(node.id);
  if (node.children) for (const c of node.children) collectSubtreeIds(c, acc);
  return acc;
}

// 由选中集合 + api 树构建保存回传的 apiPathTree：见 lib/apiPathTree.ts buildApiPathSaveTree。

type FormState = {
  name: string;
  path: string;
  parentId: number;
  icon: string;
  sort: number;
  whiteList: string;
};

const EMPTY: FormState = {
  name: "",
  path: "",
  parentId: -1,
  icon: "",
  sort: 0,
  whiteList: "0",
};

// 新增 / 编辑菜单。editing 非 null 时为编辑（加载并保存 api 绑定）。
// 新增走 /menu/add（仅字段，菜单尚不存在无法绑定）；编辑走 /menu/save（字段 + 绑定）。
export function MenuFormDialog({
  open,
  onOpenChange,
  menuType,
  tree,
  editing,
  defaultParentId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuType: number;
  tree: MenuNode[];
  editing: MenuNode | null;
  defaultParentId: number;
  onSuccess: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [apiTree, setApiTree] = useState<MenuApiPathServer[] | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 打开/换菜单时回填字段 + 重置 api 绑定状态（render 期内条件 setState，避免 effect 内 sync setState）。
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
              name: editing.name,
              path: editing.path,
              parentId: editing.parentId,
              icon: editing.icon,
              sort: editing.sort,
              whiteList: editing.whiteList,
            }
          : { ...EMPTY, parentId: defaultParentId },
      );
      if (editing) {
        setApiLoading(true);
        setApiTree(null);
      } else {
        setApiTree(null);
        setApiLoading(false);
        setSelected(new Set());
      }
    }
  }

  // 编辑时加载关联 api 树 + 初始化选中（roleBind=true）。effect 内只在异步回调 setState。
  useEffect(() => {
    if (!open || !editing) return;
    let cancelled = false;
    getMenuApiPathTree(String(editing.id))
      .then((t) => {
        if (cancelled) return;
        setApiTree(t);
        const init = new Set<string>();
        for (const svc of t)
          for (const grp of svc.groups)
            for (const ap of grp.apiPaths)
              if (ap.roleBind) init.add(apiPathKey(ap.server, ap.path));
        setSelected(init);
      })
      .catch(() => {
        if (!cancelled) setApiTree([]);
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editing]);

  const excludeIds = isEdit && editing ? collectSubtreeIds(editing) : new Set<number>();
  const parentOptions = flattenMenuOptions(tree, 0, [], excludeIds);
  const typeLabel = menuTypeLabel(menuType);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    const name = form.name.trim();
    const path = form.path.trim();
    if (!name) {
      toast.error("请输入菜单名称");
      return;
    }
    if (!path) {
      toast.error("请输入路径");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await saveMenuWithApi({
          menu: {
            id: editing.id,
            parentId: form.parentId,
            path,
            name,
            icon: form.icon,
            sort: form.sort,
            menuType,
            whiteList: form.whiteList,
          },
          apiPathTree: buildApiPathSaveTree(apiTree ?? [], selected),
        });
        toast.success("已保存");
      } else {
        await addMenu({
          parentId: form.parentId,
          path,
          name,
          icon: form.icon,
          sort: form.sort,
          menuType,
          whiteList: form.whiteList,
        });
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
      <DialogContent className={isEdit ? "sm:max-w-3xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑菜单" : "新增菜单"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改菜单信息与关联 api。" : "新建一个菜单。"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* 字段区（限宽，避免宽弹窗下输入框过空；绑定树用全宽） */}
          <div className="grid max-w-xl grid-cols-[72px_1fr] items-center gap-x-4 gap-y-3">
            <Label className="text-sm text-muted-foreground">类型</Label>
            <span className="text-sm font-medium">{typeLabel}</span>

            <Label className="text-sm text-muted-foreground">菜单名称</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="如 机构管理"
            />

            <Label className="text-sm text-muted-foreground">路径</Label>
            <Input
              value={form.path}
              onChange={(e) => set("path", e.target.value)}
              placeholder="/console/authority/org-manager"
              className="font-mono text-sm"
            />

            <Label className="text-sm text-muted-foreground">父级菜单</Label>
            <Select
              value={String(form.parentId)}
              onValueChange={(v) => set("parentId", Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择父级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">（顶级）</SelectItem>
                {parentOptions.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label className="text-sm text-muted-foreground">图标</Label>
            <IconPicker
              value={form.icon}
              onChange={(v) => set("icon", v)}
              disabled={busy}
            />

            <Label className="text-sm text-muted-foreground">排序</Label>
            <Input
              type="number"
              value={form.sort}
              onChange={(e) => set("sort", Number(e.target.value))}
              className="w-28"
            />

            <Label className="text-sm text-muted-foreground">白名单</Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.whiteList === "1"}
                onCheckedChange={(c) => set("whiteList", c ? "1" : "0")}
              />
              <span className="text-xs text-muted-foreground">
                白名单菜单无需鉴权（未登录可见）
              </span>
            </div>
          </div>

          {/* 关联 api 绑定树（仅编辑） */}
          {isEdit && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">关联 api</Label>
                <span className="font-mono text-[10px] text-muted-foreground">
                  已选 {selected.size} · 白名单不可选
                </span>
              </div>
              <div className="rounded-lg border bg-surface">
                <ScrollArea className="h-56">
                  <div className="p-2 pr-3">
                    <ApiPathBindingTree
                      tree={apiTree}
                      loading={apiLoading}
                      selected={selected}
                      onSelectedChange={setSelected}
                    />
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
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

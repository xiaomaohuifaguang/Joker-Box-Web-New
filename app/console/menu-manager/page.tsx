"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useMenuTreeAll } from "@/hooks/useMenuTreeAll";
import { removeMenu, updateMenu } from "@/lib/api/menuManage";
import { ApiError } from "@/lib/api";
import { MENU_TYPE, MENU_TYPES } from "@/types";
import type { MenuNode } from "@/types";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MenuTreeTable } from "./_components/MenuTreeTable";
import { MenuFormDialog } from "./_components/MenuFormDialog";

// 菜单管理：前台/后台分段 + 树形表格（拖拽排序/改挂）+ 新增/编辑/删除。
// 树形不分页（菜单量级小，层级是核心结构真相）。编辑走 /menu/save（字段+绑定），
// 新增走 /menu/add（仅字段），拖拽走 /menu/update（仅字段，逐个被移动菜单）。
export default function MenuManagerPage() {
  const [menuType, setMenuType] = useState<number>(MENU_TYPE.CONSOLE);
  const { tree, loading, refresh } = useMenuTreeAll(menuType);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuNode | null>(null);
  const [defaultParentId, setDefaultParentId] = useState(-1);
  const [deleting, setDeleting] = useState<MenuNode | null>(null);

  function openAddTop() {
    setEditing(null);
    setDefaultParentId(-1);
    setFormOpen(true);
  }
  function openAddChild(parent: MenuNode) {
    setEditing(null);
    setDefaultParentId(parent.id);
    setFormOpen(true);
  }
  function openEdit(node: MenuNode) {
    setEditing(node);
    setFormOpen(true);
  }

  // 拖拽落定后：逐个更新被移动菜单（仅字段），全部成功后刷新树。
  // 失败则抛错让表格回滚乐观更新。
  async function handleReorder(changed: MenuNode[]) {
    await Promise.all(
      changed.map((n) =>
        updateMenu({
          id: n.id,
          parentId: n.parentId,
          path: n.path,
          name: n.name,
          icon: n.icon,
          sort: n.sort,
          menuType,
          whiteList: n.whiteList,
        }),
      ),
    );
    refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeMenu(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">菜单管理</h1>
        <ToggleGroup
          type="single"
          value={String(menuType)}
          onValueChange={(v) => v && setMenuType(Number(v))}
          className="rounded-lg border bg-surface p-0.5"
        >
          {MENU_TYPES.map((t) => (
            <ToggleGroupItem
              key={t.value}
              value={String(t.value)}
              className="h-7 px-3 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              {t.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button onClick={openAddTop} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增顶级菜单
        </Button>
      </div>

      <MenuTreeTable
        tree={tree}
        loading={loading}
        onEdit={openEdit}
        onAddChild={openAddChild}
        onDelete={setDeleting}
        onReorder={handleReorder}
      />

      <MenuFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        menuType={menuType}
        tree={tree ?? []}
        editing={editing}
        defaultParentId={defaultParentId}
        onSuccess={refresh}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除菜单「{deleting?.name}」，此操作不可撤销。若其下有子菜单，后端可能拒绝。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

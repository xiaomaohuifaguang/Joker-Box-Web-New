"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { DynamicFormLinkageRule } from "@/types";
import { LinkageRuleEditor, ruleSummary } from "./LinkageRuleEditor";
import type { DesignerApi } from "./designer-state";

// 联动规则面板：规则卡片列表（摘要 + 启用开关 + 上下排序 + 编辑/删除）+ 新建。
// 编辑走 LinkageRuleEditor 宽弹窗。
export function LinkagePanel({ designer }: { designer: DesignerApi }) {
  const { state, addRule, updateRule, removeRule, moveRule } = designer;
  const rules = state.linkageRules;
  const allFields = [...state.fields, ...state.groups.flatMap((g) => g.fields)];
  const fieldTitle = (id: string) => allFields.find((f) => f.fieldId === id)?.title ?? id;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ index: number; rule: DynamicFormLinkageRule } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(index: number) {
    setEditing({ index, rule: rules[index] });
    setEditorOpen(true);
  }
  function handleSave(index: number | null, rule: DynamicFormLinkageRule) {
    if (index == null) addRule({ ...rule, sortOrder: rules.length });
    else updateRule(index, rule);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">联动规则（{rules.length}）</span>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 新建规则
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
          还没有联动规则，点右上「新建规则」添加。
        </p>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <div key={r.id ?? i} className={cn("rounded-md border bg-surface p-2.5", !r.enable && "opacity-60")}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name || "未命名规则"}</span>
              <Badge variant={r.enable ? "default" : "secondary"} className="shrink-0">
                {r.enable ? "启用" : "停用"}
              </Badge>
              <Switch
                checked={r.enable}
                onCheckedChange={(c) => updateRule(i, { ...r, enable: c })}
                aria-label="启用/停用"
              />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {ruleSummary(r, fieldTitle)}
            </p>
            <div className="mt-2 flex items-center gap-1">
              <Button
                type="button" variant="ghost" size="icon" className="h-7 w-7"
                disabled={i === 0} onClick={() => moveRule(i, i - 1)} aria-label="上移"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon" className="h-7 w-7"
                disabled={i === rules.length - 1} onClick={() => moveRule(i, i + 1)} aria-label="下移"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-brand"
                  onClick={() => openEdit(i)} aria-label="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleting(i)} aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <LinkageRuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fields={allFields}
        initial={editing}
        onSave={handleSave}
      />

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除规则</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除规则「{deleting != null ? rules[deleting]?.name : ""}」吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting != null) removeRule(deleting);
                setDeleting(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

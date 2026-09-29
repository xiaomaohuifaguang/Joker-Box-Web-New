"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addDynamicFormFieldTemplate,
  getDynamicFormFieldTemplateInfo,
  updateDynamicFormFieldTemplate,
} from "@/lib/api/dynamicFormFieldTemplate";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { DynamicFormField, DynamicFormFieldTemplate, DynamicFormFieldType } from "@/types";
import { cn } from "@/lib/utils";
import {
  FIELD_GROUPS,
  FIELD_REGISTRY,
  createField,
} from "@/app/console/form/dynamicForm-manager/_components/fields/registry";
import { FieldConfigPanel } from "@/app/console/form/dynamicForm-manager/_components/FieldConfigPanel";
import { parseFieldTemplate } from "@/app/console/form/fieldTemplate";

const EMPTY: DynamicFormFieldTemplate = {
  id: 0,
  title: "",
  description: "",
  fieldTemplate: "",
};

// 字段模板新增/编辑弹窗：宽弹窗三栏——左字段类型列表 / 中实时预览 / 右全属性配置（复用设计器 FieldConfigPanel）。
// 模板 title/description 是模板元数据，与字段自身的 title 是两个东西。
export function DynamicFormFieldTemplateFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DynamicFormFieldTemplate | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<DynamicFormFieldTemplate>(EMPTY);
  const [field, setField] = useState<DynamicFormField | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  // 详情加载失败标记：失败时不展示空表单（防覆盖已有模板），给重试入口。
  const [infoError, setInfoError] = useState(false);
  // 重试计数：+1 触发 effect 重新拉详情。
  const [reloadKey, setReloadKey] = useState(0);

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      // 编辑：先 loading（清旧值防闪现），effect 异步拉详情回填；新增：直接给默认 INPUT 字段。
      setDetailLoading(!!editing);
      setInfoError(false);
      setForm(EMPTY);
      setField(editing ? null : createField("INPUT", 0));
    }
  }

  useEffect(() => {
    if (!open || editing == null || editingId == null) return;
    let cancelled = false;
    getDynamicFormFieldTemplateInfo(editing)
      .then((d) => {
        if (cancelled) return;
        setForm(d);
        const parsed = parseFieldTemplate(d.fieldTemplate);
        if (parsed) {
          setField(parsed);
        } else {
          // 存量脏数据/手改 JSON 损坏：回退默认字段，不阻塞编辑。
          setField(createField("INPUT", 0));
          toast.warning("字段模板内容无法解析，已重置为默认字段");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "加载详情失败");
          setInfoError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId, reloadKey]);

  function patchField(patch: Partial<DynamicFormField>) {
    setField((f) => (f ? { ...f, ...patch } : f));
  }

  // 切换字段类型：createField 重建（新 fieldId + 类型默认属性），保留当前字段标题。
  function switchType(type: DynamicFormFieldType) {
    setField((f) => {
      const next = createField(type, 0);
      return { ...next, title: f?.title ?? next.title };
    });
  }

  async function submit() {
    if (!form.title?.trim()) {
      toast.error("请填写模板标题");
      return;
    }
    if (!field?.title?.trim()) {
      toast.error("请填写字段标题");
      return;
    }
    setBusy(true);
    const payload: DynamicFormFieldTemplate = {
      ...form,
      title: form.title.trim(),
      fieldTemplate: JSON.stringify(field),
    };
    try {
      if (editing) {
        await updateDynamicFormFieldTemplate(payload);
        toast.success("已保存");
      } else {
        await addDynamicFormFieldTemplate(payload);
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
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑字段模板" : "新增字段模板"}</DialogTitle>
          <DialogDescription>
            选择字段类型并配置全部属性，保存为可复用的字段模板
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : infoError ? (
          // 详情加载失败：不展示空表单，避免保存时覆盖已有模板。
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载字段模板详情失败</p>
            <Button
              variant="outline"
              onClick={() => {
                setInfoError(false);
                setDetailLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              重试
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 模板元信息 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">模板标题 *</Label>
                <Input
                  value={form.title ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="如：审批结果单选"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">描述</Label>
                <Input
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="模板用途说明"
                />
              </div>
            </div>

            {/* 三栏：类型 / 预览 / 配置 */}
            {field && (
              <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_19rem]">
                {/* 左：字段类型列表（按设计器四组分组） */}
                <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto rounded-lg border p-2">
                  {FIELD_GROUPS.map((group) => {
                    const items = Object.values(FIELD_REGISTRY).filter(
                      (m) => m.group === group,
                    );
                    if (!items.length) return null;
                    return (
                      <div key={group}>
                        <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">
                          {group}
                        </div>
                        <div className="flex flex-col gap-1">
                          {items.map((m) => (
                            <button
                              key={m.type}
                              type="button"
                              onClick={() => switchType(m.type)}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-left text-sm transition-colors hover:border-brand hover:bg-accent",
                                field.type === m.type &&
                                  "border-brand bg-accent font-medium",
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 中：实时预览（本地沙盒值，key=fieldId 切类型重挂载复位） */}
                <div className="max-h-[52vh] overflow-y-auto rounded-lg border bg-muted/30 p-4">
                  <div className="mb-1.5 text-sm font-medium">
                    {field.title}
                    {field.required === "1" && (
                      <span className="ml-0.5 text-destructive">*</span>
                    )}
                  </div>
                  <FieldPreview key={field.fieldId} field={field} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    预览为沙盒交互，默认值在右侧配置面板设置
                  </p>
                </div>

                {/* 右：全属性配置（复用设计器 FieldConfigPanel；模板无联动，linkageRules 恒空） */}
                <div className="max-h-[52vh] min-h-0 overflow-hidden rounded-lg border">
                  <FieldConfigPanel
                    field={field}
                    allFields={[field]}
                    linkageRules={[]}
                    onChange={patchField}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy || detailLoading || infoError}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 预览沙盒：用字段真实控件渲染，value 本地受控（初始取 defaultValue），改动不回写字段。
function FieldPreview({ field }: { field: DynamicFormField }) {
  const meta = FIELD_REGISTRY[field.type];
  const Control = meta.Control;
  const [value, setValue] = useState<unknown>(field.defaultValue);
  return <Control field={field} value={value} onChange={setValue} />;
}

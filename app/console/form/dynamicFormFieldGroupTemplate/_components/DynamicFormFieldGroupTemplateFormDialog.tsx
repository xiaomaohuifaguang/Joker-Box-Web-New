"use client";

import { useEffect, useState } from "react";
import { Eye, LayoutTemplate, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  addDynamicFormFieldGroupTemplate,
  getDynamicFormFieldGroupTemplateInfo,
  updateDynamicFormFieldGroupTemplate,
} from "@/lib/api/dynamicFormFieldGroupTemplate";
import { ApiError } from "@/lib/api";
import { randomId } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DynamicFormFieldGroupTemplate, DynamicFormFieldType } from "@/types";
import {
  useDesignerState,
  emptyState,
  UNGROUPED_ID,
  type DesignerState,
} from "@/app/console/form/dynamicForm-manager/_components/designer-state";
import {
  FIELD_GROUPS,
  FIELD_REGISTRY,
  createField,
} from "@/app/console/form/dynamicForm-manager/_components/fields/registry";
import { FormCanvas } from "@/app/console/form/dynamicForm-manager/_components/FormCanvas";
import { FieldConfigPanel } from "@/app/console/form/dynamicForm-manager/_components/FieldConfigPanel";
import { LinkagePanel } from "@/app/console/form/dynamicForm-manager/_components/LinkagePanel";
import { TemplatePickerDialog } from "@/app/console/form/dynamicForm-manager/_components/TemplatePickerDialog";
import { FormPreviewDialog } from "@/app/console/form/dynamicForm-manager/_components/FormPreviewDialog";
import { fieldsFromTemplate, parseFieldTemplate, rulesFromTemplate } from "@/app/console/form/fieldTemplate";

const EMPTY: DynamicFormFieldGroupTemplate = {
  id: 0,
  title: "",
  description: "",
  fieldsTemplate: "",
  linkageRules: "",
};

// 字段组合模板新增/编辑弹窗：宽弹窗三栏——左字段列表 / 中画布 / 右配置+联动。
// fieldsTemplate = JSON.stringify(未分组 DynamicFormField[])，linkageRules = JSON.stringify(联动规则)。
// 单次引用后无关联：插入时重新生成 fieldId/sort，改模板不影响已插入表单。
export function DynamicFormFieldGroupTemplateFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DynamicFormFieldGroupTemplate | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<DynamicFormFieldGroupTemplate>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [infoError, setInfoError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const designer = useDesignerState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedField = designer.state.fields.find((f) => f.fieldId === selectedId) ?? null;
  // 详情字段在 designer.reset 后读取（effect 内）；编辑回填与 designer 初始化顺序用 openKey 区分。
  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      setDetailLoading(!!editing);
      setInfoError(false);
      setForm(EMPTY);
      setSelectedId(null);
      // 新增：默认一个空 INPUT 字段起步。
      if (!editing) {
        designer.reset(emptyState());
        const f = createField("INPUT", 0);
        designer.addField(f, UNGROUPED_ID);
        setSelectedId(f.fieldId);
      }
    }
  }

  useEffect(() => {
    if (!open || editing == null || editingId == null) return;
    let cancelled = false;
    getDynamicFormFieldGroupTemplateInfo(editing)
      .then((d) => {
        if (cancelled) return;
        setForm(d);
        const fields = fieldsFromTemplate(d.fieldsTemplate);
        // 字段保留原始 fieldId（fieldsFromTemplate 不再重生成），与规则引用天然一致，直接解析规则。
        const rules = rulesFromTemplate(d.linkageRules);
        if (!fields) {
          toast.warning("字段模板内容无法解析，已重置为默认字段");
        }
        const nextState: DesignerState = {
          name: "",
          description: "",
          fields: fields ?? [createField("INPUT", 0)],
          groups: [],
          linkageRules: rules,
        };
        designer.reset(nextState);
        setSelectedId(nextState.fields[0]?.fieldId ?? null);
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

  function addBlankField(type: DynamicFormFieldType) {
    const f = createField(type, designer.state.fields.length);
    designer.addField(f, UNGROUPED_ID);
    setSelectedId(f.fieldId);
  }

  async function submit() {
    if (!form.title?.trim()) {
      toast.error("请填写模板标题");
      return;
    }
    if (designer.state.fields.length === 0) {
      toast.error("请至少添加一个字段");
      return;
    }
    setBusy(true);
    const payload: DynamicFormFieldGroupTemplate = {
      ...form,
      title: form.title.trim(),
      fieldsTemplate: JSON.stringify(designer.state.fields),
      linkageRules: JSON.stringify(designer.state.linkageRules),
    };
    try {
      if (editing) {
        await updateDynamicFormFieldGroupTemplate(payload);
        toast.success("已保存");
      } else {
        await addDynamicFormFieldGroupTemplate(payload);
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

  const allFields = designer.state.fields;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑字段组合模板" : "新增字段组合模板"}</DialogTitle>
          <DialogDescription>
            组合一组字段及其联动规则，保存为可复用的模板，插入设计器后为一组字段
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : infoError ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载字段组合模板详情失败</p>
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
                  placeholder="如：地址信息组"
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

            {/* 三栏：字段类型列表 / 画布 / 配置+联动 */}
            <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_17rem]">
              {/* 左：字段类型列表（点类型添加空白字段）+ 从模板插入 */}
              <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto rounded-lg border p-2">
                <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  从模板插入
                </Button>
                <div className="flex flex-col gap-2">
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
                              onClick={() => addBlankField(m.type)}
                              className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-left text-sm transition-colors hover:border-brand hover:bg-accent"
                            >
                              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 中：画布（复用设计器 FormCanvas；hideUngroupedTitle=整个集合就是一个、无分组） */}
              <div className="max-h-[52vh] min-h-0 overflow-hidden rounded-lg border">
                <FormCanvas
                  designer={designer}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  hideUngroupedTitle
                />
              </div>

              {/* 右：配置 / 联动 两 Tab */}
              <div className="max-h-[52vh] min-h-0 overflow-hidden rounded-lg border">
                <Tabs defaultValue="field" className="flex h-full flex-col">
                  <TabsList className="m-2 mb-0 grid w-auto grid-cols-2">
                    <TabsTrigger value="field">字段配置</TabsTrigger>
                    <TabsTrigger value="linkage">
                      联动规则（{designer.state.linkageRules.length}）
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="field" className="mt-2 min-h-0 flex-1 overflow-hidden">
                    <FieldConfigPanel
                      field={selectedField}
                      allFields={allFields}
                      linkageRules={designer.state.linkageRules}
                      onChange={(patch) => selectedId && designer.updateField(selectedId, patch)}
                    />
                  </TabsContent>
                  <TabsContent value="linkage" className="mt-2 min-h-0 flex-1 overflow-hidden">
                    <LinkagePanel designer={designer} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={designer.state.fields.length === 0}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            预览
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy || detailLoading || infoError}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* 联动规则预览：真实控件渲染引擎（DynamicFormRenderer），改值即联动求值，可交互+提交校验。 */}
      <FormPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        state={{
          name: form.title || "字段组合预览",
          description: form.description ?? "",
          fields: designer.state.fields,
          groups: [],
          linkageRules: designer.state.linkageRules,
        }}
      />

      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(tpl) => {
          // 复用单字段解析：剥 id/value + 重生成 fieldId；sort 由插入时容器长度定。
          const parsed = parseFieldTemplate(tpl.fieldTemplate);
          if (!parsed) {
            toast.error("字段模板内容无法解析");
            return;
          }
          const { id, value, ...rest } = parsed;
          void id;
          void value;
          const field = { ...rest, fieldId: randomId(), sort: designer.state.fields.length };
          designer.addField(field, UNGROUPED_ID);
          setSelectedId(field.fieldId);
        }}
      />
    </Dialog>
  );
}

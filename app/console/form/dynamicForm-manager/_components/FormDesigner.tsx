"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { addDynamicForm, getDynamicFormInfo, updateDynamicForm } from "@/lib/api/dynamicForm";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DynamicFormFieldType } from "@/types";
import { useDesignerState, toPayload, stateFromForm, UNGROUPED_ID, groupKey } from "./designer-state";
import { createField } from "./fields/registry";
import { FieldPalette } from "./FieldPalette";
import { FormCanvas } from "./FormCanvas";
import { FieldConfigPanel } from "./FieldConfigPanel";
import { FormPreviewDialog } from "./FormPreviewDialog";

// 表单设计器：顶栏（返回/名称/描述/预览/保存）+ 三栏（字段库 | 画布 | 配置）。
// id 为空 = 新增；保存新增后回调 onSaved 让外层 replace 成 ?design=id。
export function FormDesigner({
  id,
  onBack,
  onSaved,
}: {
  id: string | null;
  onBack: () => void;
  onSaved: (newId: string) => void;
}) {
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const designer = useDesignerState();

  // 编辑态：加载详情一次性初始化。
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getDynamicFormInfo(id)
      .then((form) => {
        if (!cancelled) designer.reset(stateFromForm(form));
      })
      .catch(() => !cancelled && toast.error("加载表单失败"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const selectedField = useMemo(() => {
    if (!selectedId) return null;
    return (
      designer.state.fields.find((f) => f.fieldId === selectedId) ??
      designer.state.groups.flatMap((g) => g.fields).find((f) => f.fieldId === selectedId) ??
      null
    );
  }, [designer.state, selectedId]);

  function handleAddField(
    type: DynamicFormFieldType,
    containerId: string,
    newGroupName?: string,
  ) {
    // 新建分组：组 + 字段一次性加入（避免 setState 不同步）。
    if (newGroupName) {
      const field = createField(type, 0);
      designer.reset({
        ...designer.state,
        groups: [
          ...designer.state.groups,
          {
            name: newGroupName,
            sort: designer.state.groups.length,
            collapsed: "0",
            fields: [field],
            clientId: crypto.randomUUID(),
          },
        ],
      });
      setSelectedId(field.fieldId);
      return;
    }
    // 加入未分组或已有分组（containerId 是分组名或 UNGROUPED_ID）。
    if (containerId === UNGROUPED_ID || !containerId) {
      const field = createField(type, designer.state.fields.length);
      designer.addField(field, UNGROUPED_ID);
      setSelectedId(field.fieldId);
      return;
    }
    const g = designer.state.groups.find((x) => x.name === containerId);
    if (g) {
      const field = createField(type, g.fields.length);
      designer.addField(field, groupKey(g));
      setSelectedId(field.fieldId);
    }
  }

  async function save() {
    const s = designer.state;
    if (!s.name.trim()) {
      toast.error("请输入表单名称");
      return;
    }
    setBusy(true);
    try {
      if (id) {
        await updateDynamicForm(toPayload(s, id));
        toast.success("已保存");
      } else {
        await addDynamicForm(toPayload(s));
        toast.success("已创建");
        // add 不返回 id（响应只看 code）——回列表让用户重进，或外层重查。
        onSaved("");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="min-h-0 flex-1 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 标题栏：返回 + 标题 + 名称/描述 + 预览/保存 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <h1 className="font-display text-lg font-semibold">{id ? "编辑表单" : "新增表单"}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            预览
          </Button>
          <Button size="sm" onClick={save} disabled={busy}>
            <Save className="h-4 w-4" />
            {busy ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={designer.state.name}
          onChange={(e) => designer.setMeta(e.target.value, designer.state.description)}
          placeholder="表单名称"
          className="h-9 w-64"
        />
        <Input
          value={designer.state.description}
          onChange={(e) => designer.setMeta(designer.state.name, e.target.value)}
          placeholder="描述（可选）"
          className="h-9 min-w-64 flex-1"
        />
      </div>

      {/* 三栏 */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <div className="w-56 shrink-0 overflow-y-auto border-r bg-surface">
          <FieldPalette groupNames={designer.allGroupNames} onAdd={handleAddField} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden bg-muted/30">
          <FormCanvas designer={designer} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="w-72 shrink-0 overflow-y-auto border-l bg-surface">
          <FieldConfigPanel
            field={selectedField}
            onChange={(patch) => selectedId && designer.updateField(selectedId, patch)}
          />
        </div>
      </div>

      <FormPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        state={designer.state}
      />
    </div>
  );
}

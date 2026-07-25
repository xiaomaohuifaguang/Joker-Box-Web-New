"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { addDynamicForm, getDynamicFormInfo, getPublishedForms, updateDynamicForm } from "@/lib/api/dynamicForm";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DynamicFormFieldType, DynamicFormPublishedVersion } from "@/types";
import { useDesignerState, toPayload, stateFromForm, UNGROUPED_ID, groupKey } from "./designer-state";
import { createField } from "./fields/registry";
import { FieldPalette } from "./FieldPalette";
import { FormCanvas } from "./FormCanvas";
import { FieldConfigPanel } from "./FieldConfigPanel";
import { LinkagePanel } from "./LinkagePanel";
import { FormPreviewDialog } from "./FormPreviewDialog";

// 表单设计器：顶栏（返回/名称/描述/预览/保存）+ 三栏（字段库 | 画布 | 配置）。
// id 为空 = 新增；保存新增后回调 onSaved 让外层 replace 成 ?design=id。
// readOnly=发布态只读查看（按 version 取详情，禁用全部编辑交互、不显示保存）。
export function FormDesigner({
  id,
  version,
  readOnly = false,
  onBack,
  onSaved,
}: {
  id: string | null;
  version?: string;
  readOnly?: boolean;
  onBack: () => void;
  onSaved: (newId: string) => void;
}) {
  const [loading, setLoading] = useState(!!id); // 初始加载
  const [switching, setSwitching] = useState(false); // 版本切换重载（事件里置 true，effect 完成后置 false）
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 当前查看的版本（编辑页版本切换用）。undefined=当前草稿（info 不传 version）。
  // prop version 仅作初始值（只读查看带入），之后由切换器驱动 -> 复用下方加载 effect 重拉。
  const [viewVersion, setViewVersion] = useState<string | undefined>(version);
  const [published, setPublished] = useState<DynamicFormPublishedVersion | null>(null);
  const designer = useDesignerState();

  // 编辑态（草稿/停用，非只读、有 id）：拉已发布版本列表，供版本切换器。无历史版本则不显示切换器。
  useEffect(() => {
    if (!id || readOnly) return;
    let cancelled = false;
    getPublishedForms(id)
      .then((list) => {
        if (cancelled) return;
        // data 是按 formId 聚合的 list：取 formId 匹配当前表的那条（兜底第一条，接口一般只返回当前表）。
        const mine = list.find((x) => x.formId === id) ?? list[0] ?? null;
        setPublished(mine);
      })
      .catch(() => {}); // 版本列表拉取失败不阻塞编辑，只不显示切换器
    return () => {
      cancelled = true;
    };
  }, [id, readOnly]);

  // 编辑/查看态：加载详情一次性初始化（viewVersion 指定版本，省略默认 DRAFT）。
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getDynamicFormInfo(id, viewVersion)
      .then((form) => {
        if (!cancelled) designer.reset(stateFromForm(form));
      })
      .catch(() => !cancelled && toast.error("加载表单失败"))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setSwitching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, viewVersion]);

  // 全部字段（未分组 + 各分组内），供字段配置面板「插入字段引用」下拉用（同 LinkagePanel 的算法）。
  const allFields = useMemo(
    () => [...designer.state.fields, ...designer.state.groups.flatMap((g) => g.fields)],
    [designer.state],
  );

  const selectedField = useMemo(() => {
    if (!selectedId) return null;
    return allFields.find((f) => f.fieldId === selectedId) ?? null;
  }, [allFields, selectedId]);

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

  // 初始加载（尚未拿到任何内容）才整页骨架；版本切换的重载保留顶栏切换器，仅内容区刷新。
  const initialLoading = loading && !designer.state.name && designer.state.fields.length === 0 && designer.state.groups.length === 0;
  if (initialLoading) {
    return (
      <div className="flex h-full flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="min-h-0 flex-1 rounded-lg" />
      </div>
    );
  }

  // 版本切换器可选项：当前草稿（不传 version）+ 各已发布历史版本。
  const historyVersions = published?.versions ?? [];
  const showVersionSwitch = !readOnly && !!id && historyVersions.length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 标题栏：返回 + 标题 + 版本切换 + 名称/描述 + 预览/保存 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <h1 className="font-display text-lg font-semibold">
          {readOnly ? "查看表单" : id ? "编辑表单" : "新增表单"}
        </h1>
        {showVersionSwitch && (
          <Select
            value={viewVersion ?? "__draft__"}
            onValueChange={(v) => {
              setSwitching(true);
              setViewVersion(v === "__draft__" ? undefined : v);
            }}
            disabled={switching}
          >
            <SelectTrigger className="h-9 w-48" aria-label="版本切换">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="__draft__">当前草稿</SelectItem>
              {historyVersions.map((v) => (
                <SelectItem key={v.version} value={v.version ?? ""}>
                  {v.version}
                  {v.version === published?.latestVersion ? "（最新发布）" : ""}
                  {v.publishTime ? ` · ${v.publishTime}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            预览
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={save} disabled={busy}>
              <Save className="h-4 w-4" />
              {busy ? "保存中…" : "保存"}
            </Button>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={designer.state.name}
          onChange={(e) => designer.setMeta(e.target.value, designer.state.description)}
          placeholder="表单名称"
          className="h-9 w-64"
          disabled={readOnly}
        />
        <Input
          value={designer.state.description}
          onChange={(e) => designer.setMeta(designer.state.name, e.target.value)}
          placeholder="描述（可选）"
          className="h-9 min-w-64 flex-1"
          disabled={readOnly}
        />
      </div>

      {/* 三栏。只读查看：designer 的所有变更都是纯客户端 state（仅「保存」落库，保存按钮已隐藏），
          故无需阻断滚动——长表单要能滚动看全。只禁用真正的编辑控件：
          字段库/画布不可点（不可加字段、不可拖拽改排序），配置面板 fieldset disabled 禁用控件但保留滚动。 */}
      <div className={cn("flex min-h-0 flex-1 overflow-hidden rounded-lg border transition-opacity", switching && "pointer-events-none opacity-50")}>
        <div className={cn("w-56 shrink-0 overflow-hidden border-r bg-surface", readOnly && "pointer-events-none select-none")}>
          <FieldPalette groupNames={designer.allGroupNames} onAdd={handleAddField} />
        </div>
        <div className={cn("min-w-0 flex-1 overflow-hidden bg-muted/30", readOnly && "pointer-events-none select-none")}>
          <FormCanvas designer={designer} selectedId={selectedId} onSelect={readOnly ? () => {} : setSelectedId} />
        </div>
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-surface">
          <Tabs defaultValue="field" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
              <TabsTrigger value="field">字段配置</TabsTrigger>
              <TabsTrigger value="linkage">联动规则</TabsTrigger>
            </TabsList>
            <fieldset disabled={readOnly} className="contents">
              <TabsContent value="field" className="min-h-0 flex-1 overflow-y-auto">
                <FieldConfigPanel
                  field={selectedField}
                  allFields={allFields}
                  linkageRules={designer.state.linkageRules}
                  onChange={(patch) => selectedId && designer.updateField(selectedId, patch)}
                />
              </TabsContent>
              <TabsContent value="linkage" className="min-h-0 flex-1 overflow-hidden">
                <LinkagePanel designer={designer} />
              </TabsContent>
            </fieldset>
          </Tabs>
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

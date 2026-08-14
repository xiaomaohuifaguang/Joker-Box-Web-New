"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import type {
  DynamicFormField,
  DynamicFormLinkageCondition,
  DynamicFormOption,
  ProcessGatewayConditionNode,
  ProcessGatewayConditionOperator,
} from "@/types";
import { COND_LABEL } from "@/app/console/form/dynamicForm-manager/_components/LinkageRuleEditor";
import { FIELD_REGISTRY, createField } from "@/app/console/form/dynamicForm-manager/_components/fields/registry";
import {
  CONDITION_SOURCES,
  flattenFieldGroups,
  type ConditionFieldGroup,
  type ConditionFieldOption,
} from "./conditionSources";
import { ConditionFieldSelect } from "./ConditionFieldSelect";

// 网关出边自定义条件编辑器（conditionType=CUSTOM，edge.data.ruleTree）。
// 递归条件树（AND/OR 组可嵌套子组），结构与动态表单联动条件树同构（复用其 COND_LABEL/运算符过滤思路），
// 字段独立为 ProcessGatewayConditionNode（fieldKey/operator/value）。
// 条件字段经 CONDITION_SOURCES[category] 加载（当前仅 FORM_FIELD=主表单字段），运算符/值控件按字段类型过滤。
// Dialog 内改动实时写入 edge.data.ruleTree（无暂存，所见即所存）。

// 运算符即动态表单的联动条件（同一组 EQ/NE/GT/...），此处起别名对齐命名。
type Operator = ProcessGatewayConditionOperator;
const NO_VALUE_OPS: Operator[] = ["EMPTY", "NOT_EMPTY"];

// 按字段类型给可用运算符（与动态表单联动 conditionsOf 同规则）。
function operatorsOf(field?: DynamicFormField): Operator[] {
  if (!field) return ["EQ", "NE", "EMPTY", "NOT_EMPTY"];
  const t = field.type;
  if (t === "NUMBER" || t === "SLIDER" || t === "RATE") {
    return ["EQ", "NE", "GT", "LT", "GE", "LE", "EMPTY", "NOT_EMPTY"];
  }
  if (t === "SELECT" || t === "MULTISELECT" || t === "RADIO" || t === "CHECKBOX" || t === "CASCADER" || t === "MULTICASCADER") {
    return ["EQ", "NE", "IN", "NOT_IN", "EMPTY", "NOT_EMPTY"];
  }
  if (t === "TABLE" || t === "DATERANGE") return ["EMPTY", "NOT_EMPTY"];
  return ["EQ", "NE", "REGEX", "EMPTY", "NOT_EMPTY"];
}

function newCondition(fields: ConditionFieldOption[]): ProcessGatewayConditionNode {
  return { nodeType: "CONDITION", category: "FORM_FIELD", fieldKey: fields[0]?.key, operator: "EQ", value: "" };
}
function newGroup(): ProcessGatewayConditionNode {
  return { nodeType: "AND", children: [] };
}

export function GatewayConditionEditor({
  formId,
  formVersion,
  value,
  readOnly,
  onChange,
}: {
  /** 主表单 id（globalFormBinding.formId；FORM_FIELD 来源用） */
  formId: string;
  /** 主表单版本（globalFormBinding.formVersion） */
  formVersion: string;
  /** 当前条件树（edge.data.ruleTree，[根组]） */
  value: ProcessGatewayConditionNode[];
  readOnly: boolean;
  onChange: (next: ProcessGatewayConditionNode[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fieldGroups, setFieldGroups] = useState<ConditionFieldGroup[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // 打开 Dialog 后拉条件字段（重置在 openDialog 里做，避免 effect 内同步 setState）。
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    CONDITION_SOURCES.FORM_FIELD({ formId, formVersion })
      .then((list) => !cancelled && setFieldGroups(list))
      .catch((err) => {
        if (cancelled) return;
        setLoadError(true);
        toast.error(err instanceof ApiError ? err.message : "加载条件字段失败");
      });
    return () => {
      cancelled = true;
    };
  }, [open, formId, formVersion]);

  function openDialog() {
    setFieldGroups(null);
    setLoadError(false);
    setOpen(true);
  }

  // 拍平分组为字段列表（按 fieldKey 查字段定义用）。
  const flat = flattenFieldGroups(fieldGroups ?? []);

  const root = value[0] ?? { nodeType: "AND" as const, children: [] };
  // 根组内条件/子组总数（触发按钮摘要用）。
  const condCount = (root.children ?? []).length;

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 w-full justify-start" onClick={openDialog}>
        配置条件
        <span className="ml-auto text-[10px] text-muted-foreground">
          {condCount > 0 ? `${condCount} 项` : "未配置"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>自定义条件</DialogTitle>
            <DialogDescription>
              满足条件时走此分支。条件字段来自流程绑定的全局表单；AND/OR 组可嵌套子组。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1">
            {loadError ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                条件字段加载失败，请关闭后重试
              </p>
            ) : fieldGroups === null ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">加载条件字段…</p>
            ) : flat.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                主表单暂无可配置字段
              </p>
            ) : (
              <div className="rounded-md border p-3">
                <GroupNode
                  node={root}
                  groups={fieldGroups}
                  flat={flat}
                  depth={0}
                  readOnly={readOnly}
                  onChange={(newRoot) => onChange([newRoot])}
                />
              </div>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}

// 递归条件组（AND/OR 节点）：头部 = 文案 + AND/OR 切换 +（非根）删除本组；
// 主体 = children（CONDITION 条件行 / AND/OR 递归子组，缩进）；底部 = 添加条件 / 添加子组。
// 不可变更新：每层 onChange(newNode) 向上冒泡，由根统一 onChange。
function GroupNode({
  node, groups, flat, depth, readOnly, onChange, onRemove,
}: {
  node: ProcessGatewayConditionNode; // nodeType 为 AND / OR
  groups: ConditionFieldGroup[]; // 带组候选字段（条件行分组选择用）
  flat: ConditionFieldOption[]; // 拍平字段（查字段定义/新建条件默认字段用）
  depth: number;
  readOnly: boolean;
  onChange: (n: ProcessGatewayConditionNode) => void;
  onRemove?: () => void;
}) {
  const children = node.children ?? [];
  const groupType = (node.nodeType === "OR" ? "OR" : "AND") as "AND" | "OR";

  const patchChild = (i: number, child: ProcessGatewayConditionNode) =>
    onChange({ ...node, children: children.map((c, idx) => (idx === i ? child : c)) });
  const removeChild = (i: number) =>
    onChange({ ...node, children: children.filter((_, idx) => idx !== i) });

  return (
    <div className={depth > 0 ? "ml-1 border-l-2 border-border pl-3" : undefined}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">{depth === 0 ? "当满足" : "满足以下"}</span>
        <Select
          value={groupType}
          onValueChange={(v) => onChange({ ...node, nodeType: v as "AND" | "OR" })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">全部满足（AND）</SelectItem>
            <SelectItem value="OR">任一满足（OR）</SelectItem>
          </SelectContent>
        </Select>
        {onRemove && !readOnly && (
          <Button
            type="button" variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="删除本组"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {children.length === 0 && (
          <p className="text-xs text-muted-foreground">暂无条件（视为恒真）</p>
        )}
        {children.map((child, i) =>
          child.nodeType === "CONDITION" ? (
            <ConditionRow
              key={`cond-${i}`}
              node={child}
              groups={groups}
              flat={flat}
              readOnly={readOnly}
              onChange={(n) => patchChild(i, n)}
              onRemove={() => removeChild(i)}
            />
          ) : (
            <GroupNode
              key={`group-${i}`}
              node={child}
              groups={groups}
              flat={flat}
              depth={depth + 1}
              readOnly={readOnly}
              onChange={(n) => patchChild(i, n)}
              onRemove={() => removeChild(i)}
            />
          ),
        )}
        {!readOnly && (
          <div className="flex gap-2 self-start">
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => onChange({ ...node, children: [...children, newCondition(flat)] })}
            >
              <Plus className="h-3.5 w-3.5" /> 添加条件
            </Button>
            <Button
              type="button" variant="outline" size="sm"
              onClick={() => onChange({ ...node, children: [...children, newGroup()] })}
            >
              <Plus className="h-3.5 w-3.5" /> 添加子组
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// 单个条件行：字段 + 运算符 + 比较值输入 + 删除。category 恒 FORM_FIELD。
function ConditionRow({
  node, groups, flat, readOnly, onChange, onRemove,
}: {
  node: ProcessGatewayConditionNode; // nodeType 为 CONDITION
  groups: ConditionFieldGroup[]; // 带组候选字段（字段下拉分组展示）
  flat: ConditionFieldOption[]; // 拍平字段（按 fieldKey 查字段定义用）
  readOnly: boolean;
  onChange: (n: ProcessGatewayConditionNode) => void;
  onRemove: () => void;
}) {
  const current = flat.find((f) => f.key === node.fieldKey);
  const avail = operatorsOf(current?.field);
  const op = node.operator ?? "EQ";
  const noVal = NO_VALUE_OPS.includes(op);

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-surface p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <ConditionFieldSelect
          groups={groups}
          value={node.fieldKey}
          disabled={readOnly}
          onChange={(v) => {
            // 切字段：运算符若不在新字段可用列表内则重置为首项，并清空值。
            const nextAvail = operatorsOf(flat.find((f) => f.key === v)?.field);
            onChange({
              ...node,
              fieldKey: v,
              operator: nextAvail.includes(op) ? op : nextAvail[0],
              value: "",
            });
          }}
        />
        <Select
          value={op}
          onValueChange={(v) => {
            const cd = v as Operator;
            // 无值运算符（EMPTY/NOT_EMPTY）清掉残留 value。
            onChange(NO_VALUE_OPS.includes(cd) ? { ...node, operator: cd, value: undefined } : { ...node, operator: cd });
          }}
          disabled={readOnly}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {avail.map((cd) => (
              <SelectItem key={cd} value={cd}>{COND_LABEL[cd as DynamicFormLinkageCondition]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!readOnly && (
          <Button
            type="button" variant="ghost" size="icon"
            className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="删除条件"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {/* 比较值：按字段类型 + 运算符渲染。无值运算符不渲染。 */}
      {!noVal && (
        <ConditionValueInput
          field={current?.field}
          operator={op}
          value={node.value}
          readOnly={readOnly}
          onChange={(v) => onChange({ ...node, value: v })}
        />
      )}
    </div>
  );
}

// 比较值输入：按字段类型 + 运算符渲染（对齐动态表单联动——用触发字段的真实控件）。
function ConditionValueInput({
  field, operator, value, readOnly, onChange,
}: {
  field?: DynamicFormField;
  operator: Operator;
  value: unknown;
  readOnly: boolean;
  onChange: (v: unknown) => void;
}) {
  if (!field) return <Input value="" disabled placeholder="先选字段" className="h-8 w-44" />;

  // IN/NOT_IN：选项类(含级联)用多选；级联用多选级联真实控件；无选项退化为逗号分隔文本。
  if (operator === "IN" || operator === "NOT_IN") {
    if (field.type === "CASCADER" || field.type === "MULTICASCADER") {
      return <ConditionFieldControl field={field} value={value} readOnly={readOnly} onChange={onChange} multiCascader />;
    }
    if ((field.options?.length ?? 0) > 0) {
      return (
        <OptionMultiSelect
          options={field.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          readOnly={readOnly}
          onChange={onChange}
        />
      );
    }
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <Input
        value={arr.join(",")}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
        placeholder="多个值用英文逗号分隔"
        className="h-8 font-mono"
      />
    );
  }

  // REGEX：正则串文本框（不是字段值）。
  if (operator === "REGEX") {
    return (
      <Input
        value={typeof value === "string" ? value : ""}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder="^\\d+$"
        className="h-8 font-mono"
      />
    );
  }

  // 单值运算符（EQ/NE/GT/LT/GE/LE）：复用字段真实控件（同动态表单联动）。
  return <ConditionFieldControl field={field} value={value} readOnly={readOnly} onChange={onChange} />;
}

// 比较值用字段类型的真实控件渲染（借 createField 造临时字段），与动态表单联动 ConditionFieldControl 一致。
// 列全部选项（含 visible=false）：显隐是预览运行态的事，条件配置需能引用任意选项。
function ConditionFieldControl({
  field, value, readOnly, onChange, multiCascader = false,
}: {
  field: DynamicFormField;
  value: unknown;
  readOnly: boolean;
  onChange: (v: unknown) => void;
  multiCascader?: boolean; // IN/NOT_IN 级联用多选级联
}) {
  const type = multiCascader && field.type === "CASCADER" ? "MULTICASCADER" : field.type;
  const Control = FIELD_REGISTRY[type].Control;
  const temp = {
    ...createField(type, 0),
    ...field,
    type,
    fieldId: field.fieldId,
    props: { ...field.props, showAllOptions: true },
  };
  return (
    <div className="min-w-0 flex-1 rounded-md border bg-muted/30 p-2">
      <Control field={temp} value={value} onChange={onChange} disabled={readOnly} />
    </div>
  );
}

// 条件「包含于/不包含于」的选项多选：触发框内平铺已选 tag + 点开内联面板 checkbox 多选。
// 内联绝对定位面板（不 portal）：Dialog 内 Popover portal 会被 react-remove-scroll 挡滚轮（见通用坑）。
function OptionMultiSelect({
  options, value, readOnly, onChange,
}: {
  options: DynamicFormOption[];
  value: string[];
  readOnly: boolean;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = new Set(value);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string, on: boolean) =>
    onChange(on ? [...value, v] : value.filter((x) => x !== v));

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-1 overflow-hidden rounded-md border bg-background px-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex flex-1 flex-wrap items-center gap-1 truncate">
          {value.length === 0 ? (
            <span className="text-muted-foreground">选值</span>
          ) : (
            value.map((v) => (
              <span key={v} className="inline-flex items-center gap-0.5 rounded bg-muted px-1 text-xs">
                {labelOf(v)}
                {!readOnly && (
                  <span
                    role="button"
                    aria-label={`移除 ${labelOf(v)}`}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v, false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </span>
            ))
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && !readOnly && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">暂无可用选项</p>
          ) : (
            options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                <Checkbox
                  checked={selected.has(o.value)}
                  onCheckedChange={(c) => toggle(o.value, c === true)}
                />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

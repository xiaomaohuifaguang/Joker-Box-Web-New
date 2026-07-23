"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type {
  DynamicFormField,
  DynamicFormLinkageActionType,
  DynamicFormLinkageCondition,
  DynamicFormLinkageNode,
  DynamicFormLinkageRule,
  DynamicFormOption,
} from "@/types";
import { FIELD_REGISTRY, createField } from "./fields/registry";
import { OptionsEditor } from "./OptionsEditor";

// 规则编辑器（宽弹窗）：条件区（递归条件树 AND/OR 可嵌套子组）+ 动作区（目标 + 动作 + 参数）。
// 条件值输入按触发字段类型渲染对应控件；操作符按类型过滤。
// OPTION 动作 = 勾选目标字段已配选项中命中时可见的子集（actionValue = string[]，不可增删改选项）。

export const ACTION_LABEL: Record<DynamicFormLinkageActionType, string> = {
  SHOW: "显示", HIDE: "隐藏", REQUIRED: "设为必填", OPTION: "设置选项",
  VALUE: "设置值", DISABLED: "禁用", ENABLED: "启用",
  SET_PATTERN: "设置正则", SET_SPAN: "设置宽度",
};

export const COND_LABEL: Record<DynamicFormLinkageCondition, string> = {
  EQ: "等于", NE: "不等于", GT: "大于", LT: "小于", GE: "大于等于", LE: "小于等于",
  IN: "包含于", NOT_IN: "不包含于", EMPTY: "为空", NOT_EMPTY: "非空", REGEX: "正则匹配",
};

const NO_VALUE_CONDS: DynamicFormLinkageCondition[] = ["EMPTY", "NOT_EMPTY"];

// 动作是否需要参数。
export function actionNeedsValue(at: DynamicFormLinkageActionType): boolean {
  return at === "OPTION" || at === "VALUE" || at === "SET_PATTERN" || at === "SET_SPAN";
}

// 按字段类型给可用操作符。
function conditionsOf(field?: DynamicFormField): DynamicFormLinkageCondition[] {
  if (!field) return ["EQ", "NE", "EMPTY", "NOT_EMPTY"];
  const t = field.type;
  if (t === "NUMBER" || t === "SLIDER" || t === "RATE") {
    return ["EQ", "NE", "GT", "LT", "GE", "LE", "EMPTY", "NOT_EMPTY"];
  }
  if (t === "SELECT" || t === "MULTISELECT" || t === "RADIO" || t === "CHECKBOX" || t === "CASCADER" || t === "MULTICASCADER") {
    return ["EQ", "NE", "IN", "NOT_IN", "EMPTY", "NOT_EMPTY"];
  }
  return ["EQ", "NE", "REGEX", "EMPTY", "NOT_EMPTY"]; // 文本/日期/时间等
}

// 递归收集条件树里的全部 CONDITION 节点（自引用校验用）。
function collectConds(node: DynamicFormLinkageNode): DynamicFormLinkageNode[] {
  if (node.nodeType === "CONDITION") return [node];
  return (node.children ?? []).flatMap(collectConds);
}

// 建 value->label 映射（字段 options 含级联子级），规则摘要尽量显 label 而非 value。
function buildLabelMap(fields: DynamicFormField[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (opts?: DynamicFormOption[]) => {
    for (const o of opts ?? []) {
      if (!map.has(o.value)) map.set(o.value, o.label);
      if (o.children) walk(o.children);
    }
  };
  for (const f of fields) walk(f.options);
  return map;
}

// 值转可读文本：能映射到选项 label 用 label，否则原样。
function valLabel(v: unknown, labels: Map<string, string>): string {
  if (typeof v === "string") return labels.get(v) ?? v;
  if (Array.isArray(v)) return `[${v.map((x) => valLabel(x, labels)).join(",")}]`;
  if (typeof v === "object" && v) return JSON.stringify(v);
  return String(v ?? "");
}

// 单条件摘要文本。
function condText(c: DynamicFormLinkageNode, fields: DynamicFormField[], labels: Map<string, string>): string {
  const title = fieldTitleOf(fields, c.triggerFieldId);
  return `${title} ${COND_LABEL[c.triggerCondition ?? "EQ"]}${
    NO_VALUE_CONDS.includes(c.triggerCondition ?? "EQ") ? "" : ` ${valLabel(c.triggerValue, labels)}`
  }`;
}

// 递归求条件树摘要：AND/OR 组用各自连接符 join，子组加括号（与 evalNode 求值结构一致）。
function groupSummary(node: DynamicFormLinkageNode, fields: DynamicFormField[], labels: Map<string, string>): string {
  if (node.nodeType === "CONDITION") return condText(node, fields, labels);
  const children = node.children ?? [];
  if (children.length === 0) return "总是";
  const sep = node.nodeType === "OR" ? " 或 " : " 且 ";
  const inner = children.map((c) => groupSummary(c, fields, labels)).join(sep);
  // 根组不加括号；嵌套子组加括号以区分优先级。
  return `(${inner})`;
}

function fieldTitleOf(fields: DynamicFormField[], fieldId?: string): string {
  return fields.find((f) => f.fieldId === fieldId)?.title ?? fieldId ?? "";
}

// OPTION 摘要：列出 actionValue 树里 visible!==false 的选项 label（命中后要显示的项）。
function optionSummary(actionValue: unknown): string {
  if (!Array.isArray(actionValue)) return "";
  const shown: string[] = [];
  const walk = (opts: DynamicFormOption[]) => {
    for (const o of opts) {
      if (o.visible !== false) shown.push(o.label);
      if (o.children) walk(o.children);
    }
  };
  walk(actionValue as DynamicFormOption[]);
  return shown.length ? ` [${shown.join(",")}]` : "（全部隐藏）";
}

// 人类可读规则摘要（规则卡片用）。值尽量显 label。
export function ruleSummary(
  rule: DynamicFormLinkageRule,
  fields: DynamicFormField[],
): string {
  const labels = buildLabelMap(fields);
  const target = fieldTitleOf(fields, rule.targetFieldId);
  const root = rule.conditionTree?.[0];
  const text = !root
    ? "总是"
    : (() => {
        const raw = groupSummary(root, fields, labels);
        return raw.startsWith("(") && raw.endsWith(")") ? raw.slice(1, -1) : raw;
      })();
  // 动作值：OPTION 显可见项 label；其他需要值的显 label 化值。
  let val = "";
  if (rule.actionType === "OPTION") val = optionSummary(rule.actionValue);
  else if (actionNeedsValue(rule.actionType)) val = ` ${valLabel(rule.actionValue, labels)}`;
  return `若 ${text} → ${ACTION_LABEL[rule.actionType]} ${target}${val}`;
}

function newCondition(fields: DynamicFormField[]): DynamicFormLinkageNode {
  return { nodeType: "CONDITION", triggerFieldId: fields[0]?.fieldId, triggerCondition: "EQ", triggerValue: "" };
}

function newGroup(): DynamicFormLinkageNode {
  return { nodeType: "AND", children: [] };
}

export function emptyRule(targetFieldId = ""): DynamicFormLinkageRule {
  return {
    name: "",
    targetFieldId,
    actionType: "SHOW",
    enable: true,
    conditionTree: [{ nodeType: "AND", children: [] }],
  };
}

export function LinkageRuleEditor({
  open,
  onClose,
  fields,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  fields: DynamicFormField[];
  initial: { index: number; rule: DynamicFormLinkageRule } | null;
  onSave: (index: number | null, rule: DynamicFormLinkageRule) => void;
}) {
  const [rule, setRule] = useState<DynamicFormLinkageRule>(() => initial?.rule ?? emptyRule());
  // 打开（或换编辑目标）时重置表单：render 期守卫块替代 effect 同步 setState（react-hooks/set-state-in-effect）。
  const openKey = open ? (initial ? `edit:${initial.index}` : "new") : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (open) setRule(initial?.rule ?? emptyRule());
  }

  const fieldOf = (id?: string) => fields.find((f) => f.fieldId === id);

  const root = rule.conditionTree?.[0] ?? { nodeType: "AND" as const, children: [] };
  const targetField = fieldOf(rule.targetFieldId);

  function save() {
    if (!rule.targetFieldId) return;
    // 自引用校验：目标字段不能同时是任一条件的触发字段（含嵌套子组）。
    const triggerIds = new Set(
      (rule.conditionTree ?? []).flatMap((n) =>
        collectConds(n).map((c) => c.triggerFieldId).filter((x): x is string => Boolean(x)),
      ),
    );
    if (triggerIds.has(rule.targetFieldId)) {
      toast.error("目标字段不能同时是触发字段（自引用）");
      return;
    }
    onSave(initial?.index ?? null, { ...rule, name: rule.name.trim() });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑规则" : "新建规则"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">规则名称（可空）</Label>
            <Input
              value={rule.name}
              onChange={(e) => setRule((r) => ({ ...r, name: e.target.value }))}
              placeholder="如：已婚显示配偶"
            />
          </div>

          {/* 条件区（递归条件树，不可变更新向上冒泡） */}
          <div className="rounded-md border p-3">
            <ConditionGroupNode
              node={root}
              fields={fields}
              depth={0}
              onChange={(newRoot) => setRule((r) => ({ ...r, conditionTree: [newRoot] }))}
            />
          </div>

          {/* 动作区 */}
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">则执行</div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={rule.actionType}
                onValueChange={(v) => setRule((r) => ({ ...r, actionType: v as DynamicFormLinkageActionType, actionValue: undefined }))}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACTION_LABEL) as DynamicFormLinkageActionType[]).map((at) => (
                    <SelectItem key={at} value={at}>{ACTION_LABEL[at]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={rule.targetFieldId}
                onValueChange={(v) => setRule((r) => ({ ...r, targetFieldId: v, actionValue: undefined }))}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="目标字段" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.fieldId} value={f.fieldId}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 动作参数（按动作类型） */}
            {rule.actionType === "SET_PATTERN" && (
              <div className="mt-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">正则</Label>
                <Input
                  value={typeof rule.actionValue === "string" ? rule.actionValue : ""}
                  onChange={(e) => setRule((r) => ({ ...r, actionValue: e.target.value }))}
                  placeholder="^\\d+$" className="font-mono"
                />
              </div>
            )}
            {rule.actionType === "SET_SPAN" && (
              <div className="mt-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  宽度（{typeof rule.actionValue === "number" ? rule.actionValue : 24}/24）
                </Label>
                <Slider
                  value={[typeof rule.actionValue === "number" ? rule.actionValue : 24]}
                  min={1} max={24} step={1}
                  onValueChange={([v]) => setRule((r) => ({ ...r, actionValue: v }))}
                />
              </div>
            )}
            {rule.actionType === "VALUE" && targetField && (
              <div className="mt-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">值</Label>
                <ActionValueControl
                  field={targetField}
                  value={rule.actionValue}
                  onChange={(v) => setRule((r) => ({ ...r, actionValue: v }))}
                />
              </div>
            )}
            {rule.actionType === "OPTION" && (
              <div className="mt-3 flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  命中时替换目标字段的选项（仅配置显隐，不可增删改）
                </Label>
                <OptionVisibilityEditor
                  field={targetField}
                  value={rule.actionValue}
                  onChange={(opts) => setRule((r) => ({ ...r, actionValue: opts }))}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={save} disabled={!rule.targetFieldId}>保存规则</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 递归条件组（AND/OR 节点）：头部 = 文案 + AND/OR 切换 + （非根）删除本组；
// 主体 = children（CONDITION 条件行 / AND/OR 递归子组，缩进）；底部 = 添加条件 / 添加子组。
// 不可变更新：每层 onChange(newNode) 向上冒泡，由根统一 setRule。
function ConditionGroupNode({
  node, fields, depth, onChange, onRemove,
}: {
  node: DynamicFormLinkageNode; // nodeType 为 AND / OR
  fields: DynamicFormField[];
  depth: number;
  onChange: (n: DynamicFormLinkageNode) => void;
  onRemove?: () => void;
}) {
  const children = node.children ?? [];
  const groupType = (node.nodeType === "OR" ? "OR" : "AND") as "AND" | "OR";

  const patchChild = (i: number, child: DynamicFormLinkageNode) =>
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
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">全部满足（AND）</SelectItem>
            <SelectItem value="OR">任一满足（OR）</SelectItem>
          </SelectContent>
        </Select>
        {onRemove && (
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
              key={`${child.triggerFieldId ?? "cond"}-${i}`}
              node={child}
              fields={fields}
              onChange={(n) => patchChild(i, n)}
              onRemove={() => removeChild(i)}
            />
          ) : (
            <ConditionGroupNode
              key={`group-${i}`}
              node={child}
              fields={fields}
              depth={depth + 1}
              onChange={(n) => patchChild(i, n)}
              onRemove={() => removeChild(i)}
            />
          ),
        )}
        <div className="flex gap-2 self-start">
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => onChange({ ...node, children: [...children, newCondition(fields)] })}
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
      </div>
    </div>
  );
}

// 单个条件行：触发字段 + 操作符 + 条件值输入 + 删除。
function ConditionRow({
  node, fields, onChange, onRemove,
}: {
  node: DynamicFormLinkageNode; // nodeType 为 CONDITION
  fields: DynamicFormField[];
  onChange: (n: DynamicFormLinkageNode) => void;
  onRemove: () => void;
}) {
  const tf = fields.find((f) => f.fieldId === node.triggerFieldId);
  const avail = conditionsOf(tf);
  const noVal = NO_VALUE_CONDS.includes(node.triggerCondition ?? "EQ");

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-surface p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          value={node.triggerFieldId}
          onValueChange={(v) => {
            // 切触发字段：操作符若不在新字段可用列表内则重置为首项，并清空值
            const nextAvail = conditionsOf(fields.find((f) => f.fieldId === v));
            const cur = node.triggerCondition ?? "EQ";
            onChange({
              ...node,
              triggerFieldId: v,
              triggerCondition: nextAvail.includes(cur) ? cur : nextAvail[0],
              triggerValue: "",
            });
          }}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="触发字段" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.fieldId} value={f.fieldId}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={node.triggerCondition}
          onValueChange={(v) => {
            const cd = v as DynamicFormLinkageCondition;
            // 无值操作符（EMPTY/NOT_EMPTY）清掉残留 triggerValue
            onChange(NO_VALUE_CONDS.includes(cd)
              ? { ...node, triggerCondition: cd, triggerValue: undefined }
              : { ...node, triggerCondition: cd });
          }}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {avail.map((cd) => (
              <SelectItem key={cd} value={cd}>{COND_LABEL[cd]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button" variant="ghost" size="icon"
          className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="删除条件"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {/* 条件值：复用触发字段真实控件（REGEX 用文本框）。无值操作符不渲染。 */}
      {!noVal && (
        <ConditionValueInput
          field={tf}
          condition={node.triggerCondition ?? "EQ"}
          value={node.triggerValue}
          onChange={(v) => onChange({ ...node, triggerValue: v })}
        />
      )}
    </div>
  );
}

// OPTION 动作参数：勾选目标字段已配选项中「命中时可见」的子集（actionValue = string[]）。
// 只勾选、不可增删改选项（选项维护在字段配置里）；级联字段只列根级选项，勾中整枝可见。
// OPTION 动作编辑器：复用字段配置的选项弹窗，仅能切显隐（visibilityOnly），不可增删改。
// 打开时若 actionValue 为空，带入目标字段当前 options 全量副本（含已有显隐）；保存即整体替换。
function OptionVisibilityEditor({
  field, value, onChange,
}: {
  field?: DynamicFormField;
  value: unknown;
  onChange: (opts: DynamicFormOption[]) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!field) return <p className="text-xs text-muted-foreground">先选目标字段</p>;
  const isCascade = field.type === "CASCADER" || field.type === "MULTICASCADER";
  // 编辑中的选项树：优先用已配的 actionValue（DynamicFormOption[]），否则带入字段当前 options 副本。
  const current: DynamicFormOption[] = Array.isArray(value)
    ? (value as DynamicFormOption[])
    : (field.options ?? []);
  if (current.length === 0) return <p className="text-xs text-muted-foreground">目标字段无选项</p>;
  const hiddenCount = (list: DynamicFormOption[]): number =>
    list.reduce((acc, o) => acc + (o.visible === false ? 1 : 0) + (o.children ? hiddenCount(o.children) : 0), 0);
  const hidden = hiddenCount(current);
  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setOpen(true)}>
        <span className="text-muted-foreground">
          {current.length} 个根选项{hidden > 0 ? `，命中后隐藏 ${hidden} 项` : "，全部可见"}
        </span>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCascade ? "级联选项显隐" : "选项显隐"}（仅显隐，不可增删改）</DialogTitle>
          </DialogHeader>
          <OptionsEditor options={current} onChange={onChange} cascade={isCascade} visibilityOnly />
        </DialogContent>
      </Dialog>
    </>
  );
}

// 条件值输入：按触发字段类型 + 操作符渲染。
function ConditionValueInput({
  field, condition, value, onChange,
}: {
  field?: DynamicFormField;
  condition: DynamicFormLinkageCondition;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (!field) return <Input value="" disabled placeholder="先选触发字段" className="h-8 w-40" />;
  // 选项类（含级联）的 IN/NOT_IN：多选值（标签式多选 / 多选级联），列全部选项。
  if (condition === "IN" || condition === "NOT_IN") {
    const opts = field.options ?? [];
    if (field.type === "CASCADER" || field.type === "MULTICASCADER") {
      return <ConditionFieldControl field={field} value={value} onChange={onChange} multiCascader />;
    }
    return (
      <OptionMultiSelect
        options={opts}
        value={Array.isArray(value) ? (value as string[]) : []}
        onChange={onChange}
      />
    );
  }
  // REGEX：正则串，保留文本框（不是字段值）。
  if (condition === "REGEX") {
    return (
      <Input
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="^\\d+$"
        className="h-8 w-40 font-mono"
      />
    );
  }
  // 其余单值操作符（EQ/NE/GT/LT/GE/LE）：复用触发字段的真实控件（同 VALUE 动作）。
  return <ConditionFieldControl field={field} value={value} onChange={onChange} />;
}

// 条件值用触发字段类型的真实控件渲染（借 createField 造临时字段），与 VALUE 动作一致。
// 列全部选项（含 visible=false）：显隐是预览运行态的事，规则配置需能引用任意选项。
function ConditionFieldControl({
  field, value, onChange, multiCascader = false,
}: {
  field: DynamicFormField;
  value: unknown;
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
      <Control field={temp} value={value} onChange={onChange} />
    </div>
  );
}

// VALUE 动作的值输入：用目标字段类型的真实控件（借 createField 造临时字段渲染）。
function ActionValueControl({
  field, value, onChange,
}: {
  field: DynamicFormField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const Control = FIELD_REGISTRY[field.type].Control;
  // VALUE 赋值列全部选项（含 visible=false）：显隐是预览运行态的事，赋值需能引用任意选项。
  const temp = {
    ...createField(field.type, 0),
    ...field,
    fieldId: field.fieldId,
    props: { ...field.props, showAllOptions: true },
  };
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <Control field={temp} value={value} onChange={onChange} />
    </div>
  );
}

// 条件「包含于/不包含于」的选项多选：触发框内平铺已选 tag + 点开内联面板 checkbox 多选。
// 内联绝对定位面板（不 portal）：规则编辑 Dialog 内 Popover portal 会被 react-remove-scroll 挡滚轮。
function OptionMultiSelect({
  options, value, onChange,
}: {
  options: DynamicFormOption[];
  value: string[];
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
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-56 items-center gap-1 overflow-hidden rounded-md border bg-background px-2 text-left text-sm"
      >
        <span className="flex flex-1 flex-wrap items-center gap-1 truncate">
          {value.length === 0 ? (
            <span className="text-muted-foreground">选值</span>
          ) : (
            value.map((v) => (
              <span key={v} className="inline-flex items-center gap-0.5 rounded bg-muted px-1 text-xs">
                {labelOf(v)}
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
              </span>
            ))
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
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

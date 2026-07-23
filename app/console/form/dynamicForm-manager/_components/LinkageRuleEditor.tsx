"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { visibleOptions } from "./fields/CascaderControl";

// 规则编辑器（宽弹窗）：条件区（AND/OR + 条件行）+ 动作区（目标 + 动作 + 参数）。
// 条件值输入按触发字段类型渲染对应控件；操作符按类型过滤。

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
  if (t === "SELECT" || t === "MULTISELECT" || t === "RADIO" || t === "CHECKBOX") {
    return ["EQ", "NE", "IN", "NOT_IN", "EMPTY", "NOT_EMPTY"];
  }
  return ["EQ", "NE", "REGEX", "EMPTY", "NOT_EMPTY"]; // 文本/日期/时间等
}

// 人类可读规则摘要（规则卡片用）。
export function ruleSummary(
  rule: DynamicFormLinkageRule,
  fieldTitle: (fieldId: string) => string,
): string {
  const root = rule.conditionTree?.[0];
  const conds = (root?.children ?? []).filter((n) => n.nodeType === "CONDITION");
  const condText = conds.length === 0
    ? "总是"
    : conds
        .map((c) =>
          `${fieldTitle(c.triggerFieldId ?? "")} ${COND_LABEL[c.triggerCondition ?? "EQ"]}${
            NO_VALUE_CONDS.includes(c.triggerCondition ?? "EQ")
              ? ""
              : ` ${formatVal(c.triggerValue)}`
          }`,
        )
        .join(root?.nodeType === "OR" ? " 或 " : " 且 ");
  const val = actionNeedsValue(rule.actionType) ? ` ${formatVal(rule.actionValue)}` : "";
  return `若 ${condText} → ${ACTION_LABEL[rule.actionType]} ${fieldTitle(rule.targetFieldId)}${val}`;
}

function formatVal(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (typeof x === "object" && x && "label" in x ? (x as DynamicFormOption).label : String(x))).join(",")}]`;
  if (typeof v === "object" && v) return JSON.stringify(v);
  return String(v ?? "");
}

function newCondition(fields: DynamicFormField[]): DynamicFormLinkageNode {
  return { nodeType: "CONDITION", triggerFieldId: fields[0]?.fieldId, triggerCondition: "EQ", triggerValue: "" };
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
  const conds = (root.children ?? []).filter((n) => n.nodeType === "CONDITION");

  function patchRoot(children: DynamicFormLinkageNode[], nodeType?: "AND" | "OR") {
    setRule((r) => ({
      ...r,
      conditionTree: [{ nodeType: nodeType ?? root.nodeType as "AND" | "OR", children }],
    }));
  }
  function patchCondition(i: number, patch: Partial<DynamicFormLinkageNode>) {
    patchRoot(conds.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  const targetField = fieldOf(rule.targetFieldId);

  function save() {
    if (!rule.name.trim()) return;
    if (!rule.targetFieldId) return;
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
            <Label className="text-xs text-muted-foreground">规则名称</Label>
            <Input
              value={rule.name}
              onChange={(e) => setRule((r) => ({ ...r, name: e.target.value }))}
              placeholder="如：已婚显示配偶"
            />
          </div>

          {/* 条件区 */}
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium">当满足</span>
              <Select
                value={root.nodeType}
                onValueChange={(v) => patchRoot(conds, v as "AND" | "OR")}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">全部满足（AND）</SelectItem>
                  <SelectItem value="OR">任一满足（OR）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              {conds.map((c, i) => {
                const tf = fieldOf(c.triggerFieldId);
                const avail = conditionsOf(tf);
                const noVal = NO_VALUE_CONDS.includes(c.triggerCondition ?? "EQ");
                return (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <Select
                      value={c.triggerFieldId}
                      onValueChange={(v) => patchCondition(i, { triggerFieldId: v, triggerValue: "" })}
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
                      value={c.triggerCondition}
                      onValueChange={(v) => patchCondition(i, { triggerCondition: v as DynamicFormLinkageCondition })}
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
                    {!noVal && (
                      <ConditionValueInput
                        field={tf}
                        condition={c.triggerCondition ?? "EQ"}
                        value={c.triggerValue}
                        onChange={(v) => patchCondition(i, { triggerValue: v })}
                      />
                    )}
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => patchRoot(conds.filter((_, idx) => idx !== i))}
                      aria-label="删除条件"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => patchRoot([...conds, newCondition(fields)])}
                className="self-start"
              >
                <Plus className="h-3.5 w-3.5" /> 添加条件
              </Button>
            </div>
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
                <Label className="text-xs text-muted-foreground">选项（替换目标字段选项）</Label>
                <div className="rounded-md border p-2">
                  <OptionsEditor
                    options={Array.isArray(rule.actionValue) ? (rule.actionValue as DynamicFormOption[]) : []}
                    onChange={(opts) => setRule((r) => ({ ...r, actionValue: opts }))}
                    cascade={targetField?.type === "CASCADER" || targetField?.type === "MULTICASCADER"}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={save} disabled={!rule.name.trim() || !rule.targetFieldId}>保存规则</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  // 选项类：单选 EQ/NE 用选项下拉，IN/NOT_IN 用逗号分隔文本。
  if (["SELECT", "MULTISELECT", "RADIO", "CHECKBOX"].includes(field.type)) {
    const opts = visibleOptions(field.options ?? []);
    if (condition === "EQ" || condition === "NE") {
      return (
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-40"><SelectValue placeholder="选值" /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        value={Array.isArray(value) ? value.join(",") : ""}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder="值1,值2" className="h-8 w-40"
      />
    );
  }
  if (field.type === "NUMBER" || field.type === "SLIDER" || field.type === "RATE") {
    return (
      <Input
        type="number" value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="h-8 w-32"
      />
    );
  }
  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={condition === "REGEX" ? "^\\d+$" : "值"}
      className={`h-8 w-40 ${condition === "REGEX" ? "font-mono" : ""}`}
    />
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
  const temp = { ...createField(field.type, 0), ...field, fieldId: field.fieldId };
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <Control field={temp} value={value} onChange={onChange} />
    </div>
  );
}

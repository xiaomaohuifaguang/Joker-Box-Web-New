"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Braces, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DynamicFormField } from "@/types";
import { FIELD_REGISTRY } from "./fields/registry";
import { groupKey, type DesignerState } from "./designer-state";
import { computeFieldState, evalRule, findValueRule, type EffectiveFieldState } from "./linkage";
import { validateFieldState } from "./validate";

// 预览：把设计数据用真实表单控件按 24 栅格渲染（可交互 + 提交校验 + 分组可折叠）。
export function FormPreviewDialog({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: DesignerState;
}) {
  // 所有字段的当前值：fieldId -> value。
  const [values, setValues] = useState<Record<string, unknown>>({});
  // 提交后显示的校验错误：fieldId -> 错误信息。
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 「查看数据」弹层开关。
  const [dataOpen, setDataOpen] = useState(false);

  const allFields = [
    ...state.fields,
    ...state.groups.flatMap((g) => g.fields),
  ];

  function valueOf(f: DynamicFormField) {
    return f.fieldId in values ? values[f.fieldId] : f.defaultValue;
  }
  function setValue(fieldId: string, v: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
    // 改值即清该字段错误。
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  const rules = state.linkageRules ?? [];

  // 字段当前值（含 defaultValue 回退），供联动求值。
  function currentValues(): Record<string, unknown> {
    const v: Record<string, unknown> = {};
    for (const f of allFields) v[f.fieldId] = valueOf(f);
    return v;
  }
  // 每字段有效状态（每次渲染重算，值变即变）。
  const effState = new Map<string, EffectiveFieldState>(
    allFields.map((f) => [f.fieldId, computeFieldState(f, rules, currentValues())]),
  );

  // VALUE 规则边沿触发：条件由不满足→满足时赋一次。ref 记上次结果。
  const valueRulePrev = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    const vals = currentValues();
    for (const rule of rules) {
      if (!findValueRule(rule)) continue;
      const key = rule.id ?? `${rule.targetFieldId}:${rule.name}`;
      const hit = evalRule(rule, vals);
      const prev = valueRulePrev.current.get(key) ?? false;
      if (hit && !prev) setValue(rule.targetFieldId, rule.actionValue);
      valueRulePrev.current.set(key, hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  function submit() {
    const nextErrors: Record<string, string> = {};
    for (const f of allFields) {
      const st = effState.get(f.fieldId);
      if (!st || !st.visible || st.disabled) continue; // 隐藏/禁用不校验
      const msg = validateFieldState(f, st, valueOf(f));
      if (msg) nextErrors[f.fieldId] = msg;
    }
    setErrors(nextErrors);
    const count = Object.keys(nextErrors).length;
    if (count === 0) {
      toast.success("校验通过");
    } else {
      toast.error(`${count} 个字段校验未通过`);
    }
  }

  function reset() {
    setValues({});
    setErrors({});
  }

  // 收集当前表单数据：fieldId -> 当前值（用户改过的用 values，否则用 defaultValue）。
  // 隐藏/禁用字段不进数据。
  function collectData() {
    const data: Record<string, unknown> = {};
    for (const f of allFields) {
      const st = effState.get(f.fieldId);
      if (!st || !st.visible || st.disabled) continue; // 隐藏/禁用不进数据
      const v = valueOf(f);
      // 跳过完全空的字段（undefined/null/空串），避免噪音；false/0/空数组保留。
      if (v === undefined || v === null || v === "") continue;
      data[f.fieldId] = v;
    }
    return data;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{state.name || "未命名表单"}</DialogTitle>
        </DialogHeader>
        {state.description && (
          <p className="text-sm text-muted-foreground">{state.description}</p>
        )}
        <div className="mt-2 flex flex-col gap-4">
          {state.fields.length > 0 && (
            <PreviewGroup
              fields={state.fields}
              valueOf={valueOf}
              errors={errors}
              onChange={setValue}
              effState={effState}
            />
          )}
          {state.groups.map((g) => (
            <PreviewGroup
              key={groupKey(g)}
              title={g.name}
              collapsed={g.collapsed === "1"}
              fields={g.fields}
              valueOf={valueOf}
              errors={errors}
              onChange={setValue}
              effState={effState}
            />
          ))}
          {allFields.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">还没有字段</p>
          )}
        </div>
        {allFields.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              重置
            </Button>
            <Button variant="outline" onClick={() => setDataOpen(true)}>
              <Braces className="h-4 w-4" />
              查看数据
            </Button>
            <Button onClick={submit}>提交</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    {/* 查看数据：fieldId -> 当前值 的 JSON 结构。嵌套 Dialog，避免和预览同一层 z 冲突。 */}
    <Dialog open={dataOpen} onOpenChange={setDataOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>表单数据</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
          {JSON.stringify(collectData(), null, 2)}
        </pre>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard
                .writeText(JSON.stringify(collectData(), null, 2))
                .then(() => toast.success("已复制"))
                .catch(() => toast.error("复制失败"));
            }}
          >
            复制
          </Button>
          <Button onClick={() => setDataOpen(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}

function PreviewGroup({
  title,
  collapsed: initCollapsed,
  fields,
  valueOf,
  errors,
  onChange,
  effState,
}: {
  title?: string;
  collapsed?: boolean;
  fields: DynamicFormField[];
  valueOf: (f: DynamicFormField) => unknown;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  effState: Map<string, EffectiveFieldState>;
}) {
  const [collapsed, setCollapsed] = useState(!!initCollapsed);
  // 组内有校验错误时强制展开（否则用户看不到折叠组里的报错）。
  const hasError = fields.some((f) => errors[f.fieldId]);
  const isOpen = !collapsed || hasError;
  return (
    <div className={cn(title && "rounded-md border")}>
      {title && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-1.5 border-b px-3 py-2 text-sm font-medium"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} />
          {title}
          {hasError && <span className="ml-1 text-xs text-destructive">（有未通过项）</span>}
        </button>
      )}
      {isOpen && (
        <div className={cn("grid grid-cols-[repeat(24,minmax(0,1fr))] gap-x-3 gap-y-4", title && "p-3")}>
          {fields.map((f) => {
            const st = effState.get(f.fieldId);
            if (!st || !st.visible) return null; // 联动隐藏：不渲染（值保留、不校验、不进数据）
            return (
              <PreviewField
                key={f.fieldId}
                field={{ ...f, options: st.options, pattern: st.pattern, span: st.span, required: st.required }}
                value={valueOf(f)}
                error={errors[f.fieldId]}
                onChange={(v) => onChange(f.fieldId, v)}
                disabled={st.disabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreviewField({
  field,
  value,
  error,
  onChange,
  disabled,
}: {
  field: DynamicFormField;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const meta = FIELD_REGISTRY[field.type];
  const span = field.span ?? 24;
  const Control = meta.Control;
  return (
    <div className="flex flex-col gap-1.5" style={{ gridColumn: `span ${span} / span ${span}` }}>
      <Label className={cn("text-sm", error && "text-destructive")}>
        {field.title}
        {field.required === "1" && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className={cn(error && "[&_input]:border-destructive [&_button]:border-destructive")}>
        <Control field={field} value={value} onChange={onChange} disabled={disabled} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

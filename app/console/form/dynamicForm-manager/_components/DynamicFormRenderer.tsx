"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type {
  DynamicFormField,
  DynamicFormFieldGroup,
  DynamicFormLinkageRule,
} from "@/types";
import { FIELD_REGISTRY } from "./fields/registry";
import { groupKey } from "./designer-state";
import {
  computeFieldState,
  evalRule,
  findValueRule,
  type EffectiveFieldState,
} from "./linkage";
import { validateFieldState } from "./validate";
import { useRemoteOptions, type RemoteStatus } from "./useRemoteOptions";

export interface DynamicFormRendererProps {
  fields: DynamicFormField[];
  groups: DynamicFormFieldGroup[];
  linkageRules: DynamicFormLinkageRule[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
}

export interface DynamicFormRendererHandle {
  validate: () => Record<string, string>;
  collectData: () => Record<string, unknown>;
  clearEdgeTriggers: () => void;
}

// 共享填写态渲染器：按 fields/groups/linkageRules 用真实控件按 24 栅格渲染，
// 管联动求值 + 远程选项 + 校验 + 数据收集。受控：值/错误由父持有。
// 设计器预览（FormPreviewDialog）与前台填写页（/dynamicForm）共用。
export const DynamicFormRenderer = forwardRef<
  DynamicFormRendererHandle,
  DynamicFormRendererProps
>(function DynamicFormRenderer(
  { fields, groups, linkageRules, values, errors, onChange },
  ref,
) {
  const allFields = [...fields, ...groups.flatMap((g) => g.fields)];

  function valueOf(f: DynamicFormField) {
    return f.fieldId in values ? values[f.fieldId] : f.defaultValue;
  }
  // 当前值（含 defaultValue 回退），供联动求值与远程选项依赖替换。
  function currentValues(): Record<string, unknown> {
    const v: Record<string, unknown> = {};
    for (const f of allFields) v[f.fieldId] = valueOf(f);
    return v;
  }
  const vals = currentValues();
  // 远程选项（optionSource.type==="API"）：依赖值变化自动重拉；已去手动兜底。
  const { optionsOf, statusOf } = useRemoteOptions(allFields, vals);
  // 每字段有效状态（每次渲染重算，值变即变）。
  const effState = new Map<string, EffectiveFieldState>(
    allFields.map((f) => {
      const isApi = f.optionSource?.type === "API";
      const status = isApi ? statusOf(f.fieldId) : undefined;
      const fieldWithRemote: DynamicFormField = isApi
        ? { ...f, options: optionsOf(f) ?? [] }
        : f;
      const st = computeFieldState(fieldWithRemote, linkageRules, vals);
      // 数据源异常的 API 字段当禁用：required 置 0、options 空、disabled。
      const st2: EffectiveFieldState =
        status === "error"
          ? { ...st, required: "0", options: [], disabled: true }
          : st;
      return [f.fieldId, st2];
    }),
  );

  // VALUE 规则边沿触发：条件由不满足→满足时赋一次。ref 记上次结果。
  const valueRulePrev = useRef<Map<string, boolean>>(new Map());
  const valueChainCount = useRef(0);
  const valueChainWarned = useRef(false);
  useEffect(() => {
    const v: Record<string, unknown> = {};
    for (const f of allFields) v[f.fieldId] = valueOf(f);
    let assigned = false;
    for (const rule of linkageRules) {
      if (!findValueRule(rule)) continue;
      const key = rule.id ?? `${rule.targetFieldId}:${rule.name}`;
      const hit = evalRule(rule, v);
      const prev = valueRulePrev.current.get(key) ?? false;
      if (hit && !prev && valueChainCount.current < 10) {
        onChange(rule.targetFieldId, rule.actionValue);
        assigned = true;
      }
      valueRulePrev.current.set(key, hit);
    }
    if (assigned) {
      valueChainCount.current += 1;
      if (valueChainCount.current >= 10 && !valueChainWarned.current) {
        valueChainWarned.current = true;
        toast.error("联动规则存在循环赋值，已停止");
      }
    } else {
      valueChainCount.current = 0;
      valueChainWarned.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  useImperativeHandle(ref, () => ({
    // 逐字段校验：隐/禁跳过（数据源异常已并入 disabled）。返回 fieldId->错误（空=通过）。
    validate() {
      const nextErrors: Record<string, string> = {};
      for (const f of allFields) {
        const st = effState.get(f.fieldId);
        if (!st || !st.visible || st.disabled) continue;
        const msg = validateFieldState(f, st, valueOf(f));
        if (msg) nextErrors[f.fieldId] = msg;
      }
      return nextErrors;
    },
    // 收集提交数据：隐/禁不进，完全空（undefined/null/""）跳过，false/0/空数组保留。
    collectData() {
      const data: Record<string, unknown> = {};
      for (const f of allFields) {
        const st = effState.get(f.fieldId);
        if (!st || !st.visible || st.disabled) continue;
        const v = valueOf(f);
        if (v === undefined || v === null || v === "") continue;
        data[f.fieldId] = v;
      }
      return data;
    },
    // 清 VALUE 边沿记录 + 循环熔断计数（reset / 重拉后用，按初始态重新触发）。
    clearEdgeTriggers() {
      valueRulePrev.current.clear();
      valueChainCount.current = 0;
      valueChainWarned.current = false;
    },
  }));

  if (allFields.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">还没有字段</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {fields.length > 0 && (
        <RendererGroup
          fields={fields}
          valueOf={valueOf}
          errors={errors}
          onChange={onChange}
          effState={effState}
          statusOf={statusOf}
        />
      )}
      {groups.map((g) => (
        <RendererGroup
          key={groupKey(g)}
          title={g.name}
          collapsed={g.collapsed === "1"}
          fields={g.fields}
          valueOf={valueOf}
          errors={errors}
          onChange={onChange}
          effState={effState}
          statusOf={statusOf}
        />
      ))}
    </div>
  );
});

function RendererGroup({
  title,
  collapsed: initCollapsed,
  fields,
  valueOf,
  errors,
  onChange,
  effState,
  statusOf,
}: {
  title?: string;
  collapsed?: boolean;
  fields: DynamicFormField[];
  valueOf: (f: DynamicFormField) => unknown;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  effState: Map<string, EffectiveFieldState>;
  statusOf: (fieldId: string) => RemoteStatus;
}) {
  const [collapsed, setCollapsed] = useState(!!initCollapsed);
  // 组内有校验错误时强制展开（否则看不到折叠组里的报错）。
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
        // 24 栅格列间隙固定 rem，不随主题 --space-unit 缩放（Minimal 下两 span=12 才能同行）。
        <div className={cn("grid grid-cols-[repeat(24,minmax(0,1fr))] gap-x-[0.75rem] gap-y-4", title && "p-3")}>
          {fields.map((f) => {
            const st = effState.get(f.fieldId);
            if (!st || !st.visible) return null; // 联动隐藏：不渲染（值保留、不校验、不进数据）
            const isApi = f.optionSource?.type === "API";
            const status = isApi ? statusOf(f.fieldId) : undefined;
            return (
              <RendererField
                key={f.fieldId}
                field={{
                  ...f,
                  options: st.options,
                  pattern: st.pattern,
                  span: st.span,
                  required: st.required,
                  props: isApi
                    ? {
                        ...f.props,
                        __sourceError: status === "error",
                        __sourceLoading: status === "loading",
                      }
                    : f.props,
                }}
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

function RendererField({
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

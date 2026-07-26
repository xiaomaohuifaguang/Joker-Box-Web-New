# 前台动态表单填写页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增前台 `/dynamicForm?formId=&version=` 填写页：按 `info` 渲染已发布表单（联动/远程选项/校验），multipart `submit` 提交，成功后「提交成功 + 再填一次（重拉）」。

**Architecture:** 把设计器预览 `FormPreviewDialog` 的运行引擎（取值/联动/远程选项/校验/收集/24 栅格渲染）抽成与 Dialog 解耦的共享受控组件 `DynamicFormRenderer`（仍住 console 模块 `_components`）；`FormPreviewDialog` 变薄壳复用它。前台页面用 `getDynamicFormInfo(formId, version)` 驱动同一个渲染器，`submitDynamicForm`（multipart fetch）提交。

**Tech Stack:** Next.js 16（static export）、React 19、TS strict、Tailwind v4 token、shadcn/ui、sonner。

## Global Constraints

- 静态导出（`output:'export'`）：无 SSR/Server Actions；运行时数据全客户端从 `/joker-box/*` 拉。`useSearchParams` 必须包 `<Suspense>`。
- import 一律 `@/`；组件文件 PascalCase、hook `useXxx.ts`。
- 全部走主题 token（`bg-background`/`text-foreground`/`border`/`bg-brand` 等），**不硬编码色值**；5 预设 × 明暗自动跟随。
- 接口：`info`/`submit` 判断 `code`；业务错抛 `ApiError`（读 `.message`）。`submit` 走 **multipart 自定义 fetch**（非 `api.post` JSON），镜像 `lib/api/dynamicFormFile.ts`。
- 守卫：`<RequireAuth>`（未登录 → 404 ErrorState），`useMounted` 跳首帧。
- 守 `react-hooks/set-state-in-effect`：VALUE 边沿用 ref 模式，不在 effect 里同步 setState。
- **不重写表单引擎**：复用 `linkage.ts`/`validate.ts`/`useRemoteOptions.ts`/`fields/registry.tsx`/`designer-state.ts`。
- 验证无测试框架：`npm run lint` + `npx tsc --noEmit` 必须过；行为靠手动核对。

---

### Task 1: 抽取共享渲染器 DynamicFormRenderer + FormPreviewDialog 变薄壳

把 `FormPreviewDialog` 里「按 fields/groups/linkageRules 渲染可填表单」的全部逻辑抽到受控组件 `DynamicFormRenderer`，Dialog 只留外壳。行为必须与现状完全一致（这是重构，不加新功能）。

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/DynamicFormRenderer.tsx`
- Modify: `app/console/form/dynamicForm-manager/_components/FormPreviewDialog.tsx`

**Interfaces:**
- Consumes（全部已存在，签名照抄）：
  - `computeFieldState(field, rules, values): EffectiveFieldState`、`evalRule(rule, values): boolean`、`findValueRule(rule): boolean`、`type EffectiveFieldState` — from `./linkage`
  - `useRemoteOptions(fields, values): { optionsOf(f), statusOf(fieldId): RemoteStatus }`、`type RemoteStatus` — from `./useRemoteOptions`
  - `validateFieldState(field, state, value): string | null` — from `./validate`
  - `FIELD_REGISTRY[type].Control`、`type FieldControlProps` — from `./fields/registry`
  - `groupKey(g): string` — from `./designer-state`
- Produces（后续 Task 全部依赖此签名，一字不差）：
  ```tsx
  export interface DynamicFormRendererProps {
    fields: DynamicFormField[];                 // 未分组字段
    groups: DynamicFormFieldGroup[];            // 分组
    linkageRules: DynamicFormLinkageRule[];     // 联动规则
    values: Record<string, unknown>;            // 受控：fieldId -> value
    errors: Record<string, string>;             // 受控：fieldId -> 错误信息
    onChange: (fieldId: string, v: unknown) => void;
  }
  export interface DynamicFormRendererHandle {
    validate: () => Record<string, string>;     // 逐字段校验，返回 errors（空=通过）
    collectData: () => Record<string, unknown>; // fieldId -> 提交值（隐/禁剔除、空值跳过）
    clearEdgeTriggers: () => void;              // 清 VALUE 边沿记录 + 循环熔断计数（reset 用）
  }
  export const DynamicFormRenderer: React.ForwardRefExoticComponent<
    DynamicFormRendererProps & React.RefAttributes<DynamicFormRendererHandle>
  >;
  ```

- [ ] **Step 1: 写 DynamicFormRenderer（forwardRef 受控组件）**

平移 `FormPreviewDialog` 的 `allFields`/`valueOf`/`effState`（含 API 数据源异常→disabled+required:0）/VALUE 边沿 effect/`PreviewGroup`/`PreviewField`，并把这些改受控 + 暴露 handle。完整实现：

```tsx
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
```

- [ ] **Step 2: FormPreviewDialog 改为薄壳复用渲染器**

把 `FormPreviewDialog.tsx` 的 `valueOf`/`effState`/VALUE 边沿 effect/`PreviewGroup`/`PreviewField`/`submit`/`collectData` 全部删掉，改为：持有 `values`/`errors` state + `rendererRef`，渲染 `<DynamicFormRenderer>`，`submit()`/`reset()`/`查看数据` 调 handle。完整实现：

```tsx
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Braces } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DesignerState } from "./designer-state";
import {
  DynamicFormRenderer,
  type DynamicFormRendererHandle,
} from "./DynamicFormRenderer";

// 预览：真实控件按 24 栅格渲染（可交互 + 提交校验 + 分组可折叠）。渲染引擎见 DynamicFormRenderer。
export function FormPreviewDialog({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: DesignerState;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dataOpen, setDataOpen] = useState(false);
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

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

  function submit() {
    const nextErrors = rendererRef.current?.validate() ?? {};
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
    rendererRef.current?.clearEdgeTriggers(); // 清 VALUE 边沿，reset 后按初始态重新触发
  }

  function collectData() {
    return rendererRef.current?.collectData() ?? {};
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
          <div className="mt-2">
            <DynamicFormRenderer
              ref={rendererRef}
              fields={state.fields}
              groups={state.groups}
              linkageRules={state.linkageRules ?? []}
              values={values}
              errors={errors}
              onChange={setValue}
            />
          </div>
          {[...state.fields, ...state.groups.flatMap((g) => g.fields)].length > 0 && (
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

      {/* 查看数据：fieldId -> 当前值 的 JSON 结构。嵌套 Dialog。 */}
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
```

- [ ] **Step 3: lint + 类型检查**

Run: `npm run lint && npx tsc --noEmit`
Expected: 通过（重点：`DynamicFormRenderer` 的 `react-hooks/exhaustive-deps` 已在 effect 上 disable；无未用 import——`FormPreviewDialog` 删掉 `useEffect`/`Label`/`FIELD_REGISTRY`/`linkage`/`validate`/`useRemoteOptions` 等 import）。

- [ ] **Step 4: 手动核对预览行为不回归**

Run: `npm run dev`，进后台 `/console/form/dynamicForm-manager`，打开一张含分组+联动+远程选项+UPLOAD 的表单预览。
Expected: 渲染/联动/校验/重置/查看数据与改动前完全一致。

- [ ] **Step 5: Commit**

```bash
git add app/console/form/dynamicForm-manager/_components/DynamicFormRenderer.tsx app/console/form/dynamicForm-manager/_components/FormPreviewDialog.tsx
git commit -m "refactor: 抽取动态表单填写态渲染引擎 DynamicFormRenderer（预览/前台填写页共用）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: submit API 包装（multipart）

**Files:**
- Modify: `lib/api/dynamicForm.ts`

**Interfaces:**
- Consumes: `buildQuery`、`handleUnauthorized`、`ApiError`（from `@/lib/api`）、`getToken`（from `@/lib/auth`）——同 `lib/api/dynamicFormFile.ts` 的用法。
- Produces（Task 3 依赖）：
  ```ts
  export async function submitDynamicForm(input: {
    formId: string;
    version: string;
    data: Record<string, unknown>;
    formInstanceId?: string; // 更新语义预留，本次调用方不传
  }): Promise<string>; // 返回表单实例 id（响应 data）
  ```

- [ ] **Step 1: 追加 submitDynamicForm**

在 `lib/api/dynamicForm.ts` 末尾追加（文件顶部需新增 `import { ApiError, buildQuery, handleUnauthorized } from "@/lib/api";` 和 `import { getToken } from "@/lib/auth";`——若已 import `api` 同名符号注意合并到既有 import 行）：

```ts
// 提交：POST /dynamicForm/submit，multipart FormData（formId/version/data）。
// data 是 Map<fieldId, value>，序列化成 JSON 字符串塞单个 data 字段（后端反序列化）。
// formInstanceId 为「更新已提交实例」语义预留，本次新增提交不传。响应 data = 表单实例 id。
const SUBMIT_SUCCESS_CODE = 200;
export async function submitDynamicForm(input: {
  formId: string;
  version: string;
  data: Record<string, unknown>;
  formInstanceId?: string;
}): Promise<string> {
  const fd = new FormData();
  fd.append("formId", input.formId);
  fd.append("version", input.version);
  fd.append("data", JSON.stringify(input.data));
  if (input.formInstanceId) fd.append("formInstanceId", input.formInstanceId);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/joker-box/dynamicForm/submit", {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, `提交失败: ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body) throw new ApiError(res.status, "提交失败：响应异常");
  handleUnauthorized(body.code, !!token);
  if (body.code !== SUBMIT_SUCCESS_CODE)
    throw new ApiError(body.code, body.msg || `提交失败: ${body.code}`);
  return body.data as string;
}
```

注意：`buildQuery` 本函数没用到，**不要 import 它**（只 import `ApiError`、`handleUnauthorized`），避免 lint 报未用。上面 Interfaces 提到的 `buildQuery` 删除。

- [ ] **Step 2: lint + 类型检查**

Run: `npm run lint && npx tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add lib/api/dynamicForm.ts
git commit -m "feat: 动态表单 submit 接口包装（multipart formId/version/data）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 填写页 hook useDynamicFormFill

**Files:**
- Create: `hooks/useDynamicFormFill.ts`

**Interfaces:**
- Consumes: `getDynamicFormInfo(id, version)`（Task 已存在）、`submitDynamicForm`（Task 2）、`DynamicForm`（from `@/types`）。
- Produces（Task 4 依赖）：
  ```ts
  export type FillStatus = "loading" | "error" | "filling" | "submitting" | "submitted";
  export function useDynamicFormFill(formId: string | null, version: string | null): {
    status: FillStatus;
    form: DynamicForm | null;
    loadError: string | null;          // status==="error" 时的信息
    values: Record<string, unknown>;
    errors: Record<string, string>;
    setValue: (fieldId: string, v: unknown) => void; // 改值即清该字段错误
    submit: (validate: () => Record<string, string>, collect: () => Record<string, unknown>) => Promise<void>;
    refill: () => void;                // 再填一次：重拉 info + 清 values/errors
  };
  ```

- [ ] **Step 1: 写 useDynamicFormFill**

`submit`/`refill` 不直接持渲染器 ref（保持 hook 与 UI 解耦），由页面把渲染器的 `validate`/`collectData` 作参传进来。完整实现：

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getDynamicFormInfo, submitDynamicForm } from "@/lib/api/dynamicForm";
import type { DynamicForm } from "@/types";

export type FillStatus = "loading" | "error" | "filling" | "submitting" | "submitted";

// 前台动态表单填写页数据：按 formId+version 拉 info，管 values/errors/submit/refill。
// 渲染/联动/校验/收集在 DynamicFormRenderer；本 hook 只持状态与提交。
export function useDynamicFormFill(formId: string | null, version: string | null) {
  const [status, setStatus] = useState<FillStatus>("loading");
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 竞态守卫：重拉/参数变化时旧响应不覆盖新状态。
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!formId || !version) {
      setStatus("error");
      setLoadError("缺少参数 formId 或 version");
      setForm(null);
      return;
    }
    const seq = ++loadSeq.current;
    setStatus("loading");
    setLoadError(null);
    try {
      const info = await getDynamicFormInfo(formId, version);
      if (seq !== loadSeq.current) return;
      setForm(info);
      setValues({});
      setErrors({});
      setStatus("filling");
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setForm(null);
      setLoadError(e instanceof Error ? e.message : "加载失败");
      setStatus("error");
    }
  }, [formId, version]);

  useEffect(() => {
    void load();
  }, [load]);

  const setValue = useCallback((fieldId: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  // validate/collect 由页面从渲染器 handle 传入；校验失败抛错并置 errors。
  const submit = useCallback(
    async (
      validate: () => Record<string, string>,
      collect: () => Record<string, unknown>,
    ) => {
      if (!formId || !version) return;
      const nextErrors = validate();
      setErrors(nextErrors);
      const count = Object.keys(nextErrors).length;
      if (count > 0) {
        toast.error(`${count} 个字段校验未通过`);
        return;
      }
      setStatus("submitting");
      try {
        await submitDynamicForm({ formId, version, data: collect() });
        setStatus("submitted");
      } catch (e) {
        setStatus("filling");
        toast.error(e instanceof Error ? e.message : "提交失败");
      }
    },
    [formId, version],
  );

  // 再填一次：重拉 info 保证一致性（load 内已清 values/errors + 状态回 filling）。
  const refill = useCallback(() => {
    void load();
  }, [load]);

  return { status, form, loadError, values, errors, setValue, submit, refill };
}
```

- [ ] **Step 2: lint + 类型检查**

Run: `npm run lint && npx tsc --noEmit`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add hooks/useDynamicFormFill.ts
git commit -m "feat: useDynamicFormFill — 前台填表页数据 hook（info 加载 + submit + refill）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 前台页面 /dynamicForm

**Files:**
- Create: `app/(front)/dynamicForm/page.tsx`

**Interfaces:**
- Consumes: `RequireAuth`（`@/components/RequireAuth`）、`ErrorState`（`@/components/ErrorState`）、`useDynamicFormFill` + `FillStatus`（Task 3）、`DynamicFormRenderer` + `DynamicFormRendererHandle`（Task 1）、`Button`（`@/components/ui/button`）、`Container`（`@/components/Container`）。
- Produces: 路由 `/dynamicForm?formId=&version=`。

- [ ] **Step 1: 写页面**

`useSearchParams` 需 `<Suspense>`（静态导出），故把读参 + 主体拆成内层组件，外层 `page.tsx` 默认导出包 `<RequireAuth><Suspense>`。成功态用 `CheckCircle2`（lucide）。完整实现：

```tsx
"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState } from "@/components/ErrorState";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { useDynamicFormFill } from "@/hooks/useDynamicFormFill";
import {
  DynamicFormRenderer,
  type DynamicFormRendererHandle,
} from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";

// 前台动态表单填写页：/dynamicForm?formId=&version=。需登录。
// 渲染引擎复用设计器的 DynamicFormRenderer；提交走 /dynamicForm/submit。
export default function DynamicFormPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <DynamicFormFill />
      </Suspense>
    </RequireAuth>
  );
}

function DynamicFormFill() {
  const params = useSearchParams();
  const formId = params.get("formId");
  const version = params.get("version");
  const { status, form, loadError, values, errors, setValue, submit, refill } =
    useDynamicFormFill(formId, version);
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  if (status === "loading") {
    return (
      <Container className="flex flex-1 items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </Container>
    );
  }
  if (status === "error" || !form) {
    return (
      <ErrorState
        code="404"
        title="表单不可用"
        message={loadError ?? "这张表单不存在或已下线。"}
      />
    );
  }

  // 提交成功：成功态 + 再填一次（重拉 info）。
  if (status === "submitted") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="mt-4 font-display text-2xl font-semibold">提交成功</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          「{form.name}」已收到你的填写。
        </p>
        <Button className="mt-6" onClick={() => { rendererRef.current?.clearEdgeTriggers(); refill(); }}>
          再填一次
        </Button>
      </Container>
    );
  }

  const allFields = [...(form.fields ?? []), ...(form.groups ?? []).flatMap((g) => g.fields)];
  const submitting = status === "submitting";

  return (
    <Container className="flex-1 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{form.name}</h1>
      {form.description && (
        <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>
      )}
      <div className="mt-6">
        <DynamicFormRenderer
          ref={rendererRef}
          fields={form.fields ?? []}
          groups={form.groups ?? []}
          linkageRules={form.linkageRules ?? []}
          values={values}
          errors={errors}
          onChange={setValue}
        />
      </div>
      {allFields.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <Button
            onClick={() =>
              void submit(
                () => rendererRef.current?.validate() ?? {},
                () => rendererRef.current?.collectData() ?? {},
              )
            }
            disabled={submitting}
          >
            {submitting ? "提交中…" : "提交"}
          </Button>
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: lint + 类型检查 + 构建**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: 全过（`build` 额外验证静态导出下 `useSearchParams` + Suspense 不报错）。

- [ ] **Step 3: 手动端到端核对**

Run: `npm run dev`。
- 未登录访问 `/dynamicForm?formId=X&version=Y` → 404 ErrorState。
- 登录后缺参（只 `?formId=X`）→ 「表单不可用/缺少参数」。
- 后台发布一张含分组+联动(SHOW/REQUIRED/OPTION/VALUE)+远程选项+UPLOAD+TABLE+DATERANGE 的表单 → 前台打开 → 校验拦截（红字 + 折叠组强制展开）→ 填全提交 → DevTools Network 确认 `/dynamicForm/submit` 的 FormData 带 `formId`/`version`/`data`(JSON) → 成功态 → 「再填一次」重拉回填写态。

- [ ] **Step 4: Commit**

```bash
git add "app/(front)/dynamicForm/page.tsx"
git commit -m "feat: 前台动态表单填写页 /dynamicForm（info 渲染 + submit 提交 + 再填一次）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: README 同步（新增模块 + 跨模块共享约定）

按项目 README 同步规则：新增了路由模块 `dynamicForm`、且确立了「前台复用 console 渲染器」的跨文件约定，需更新两处 README。

**Files:**
- Modify: `app/(front)/README.md`
- Modify: `app/console/form/dynamicForm-manager/README.md`

- [ ] **Step 1: (front)/README.md 加一行**

在 `app/(front)/README.md` 的列表里（`file-server/` 那条之后）插入：

```markdown
- `dynamicForm/`：动态表单填写页。`/dynamicForm?formId=&version=`，`<RequireAuth>`。复用后台设计器的 `DynamicFormRenderer`（渲染/联动/远程选项/校验）按 `info(formId,version)` 渲染已发布版本，`/dynamicForm/submit`（multipart formId/version/data）提交，成功态 + 再填一次（重拉）。hook `hooks/useDynamicFormFill`。
```

- [ ] **Step 2: console README 记渲染器抽取 + 共享约定**

在 `app/console/form/dynamicForm-manager/README.md` 的「结构」列表里，`designer-state.ts` 那条之后插入：

```markdown
- `DynamicFormRenderer.tsx`：填写态渲染引擎（受控 forwardRef）。从 `FormPreviewDialog` 抽出——取值/联动求值(`computeFieldState`)/远程选项(`useRemoteOptions`)/校验(`validate`)/收集(`collectData`)/VALUE 边沿 + 24 栅格 + 分组折叠。props `{fields,groups,linkageRules,values,errors,onChange}`，handle `{validate,collectData,clearEdgeTriggers}`。**预览（FormPreviewDialog 薄壳）与前台 `/dynamicForm` 共用——跨模块共享件，前台直接 import，勿复制引擎。**
```

- [ ] **Step 3: Commit**

```bash
git add "app/(front)/README.md" app/console/form/dynamicForm-manager/README.md
git commit -m "docs: README 同步前台 dynamicForm 模块与 DynamicFormRenderer 共享约定

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage：** info 渲染(T4)/共享渲染器(T1)/submit multipart(T2)/refill 重拉(T3+T4)/守卫 RequireAuth(T4)/错误处理(T3 load+submit、T4 三态)/远程选项与联动复用(T1)/README 同步(T5) — 全覆盖。非目标（formInstanceId 更新/回显）未实现，符合 spec。

**Placeholder scan：** 无 TBD/TODO；所有代码步含完整实现。

**Type consistency：** `DynamicFormRendererProps/Handle`(T1) ↔ T4 调用一致；`submitDynamicForm`(T2) ↔ T3 调用一致；`useDynamicFormFill` 返回( T3) ↔ T4 解构一致；`FillStatus` 五态 T3 定义 T4 全用（loading/error/filling/submitting/submitted）。T2 Interfaces 误列 `buildQuery`，已在 Step 1 注明不 import。

**一处已修正：** T4 「再填一次」先 `clearEdgeTriggers()` 再 `refill()`，避免重拉后旧 VALUE 边沿记录残留。

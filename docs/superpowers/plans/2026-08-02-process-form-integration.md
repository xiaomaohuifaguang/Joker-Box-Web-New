# 申请中心表单接入 (Process Form Integration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the bound dynamic form in the 申请中心 start/edit/detail views, honoring per-field `permission` (VISIBLE/READONLY/HIDDEN/REQUIRED), and submit the form data as `globalFormData` on start/saveDraft.

**Architecture:** `startInfo` returns `startForm.globalForm` (a `DynamicForm`); `processInstance/info` returns `taskForm.globalForm` with `fields[].value` holding saved data. Views map each field's `permission` into a cloned field (HIDDEN→`visible:false`, READONLY→`props.__processReadonly:true`, REQUIRED→`required:"1"`), seed controlled `values`, render via the shared `DynamicFormRenderer`, and on submit `collectData()` → `globalFormData`. A one-line hook in `linkage.ts computeFieldState` makes `__processReadonly` force `disabled`. No form → title-only (form is optional).

**Tech Stack:** Next.js 16 static export, React 19, TS strict, Tailwind v4, shared `DynamicFormRenderer` (`@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer`).

## Global Constraints

- **No test framework.** Per-task verify = `npx tsc --noEmit` clean + `npm run lint` clean; final task also `npm run build`.
- **Imports** `@/` only (intra-folder `./Xxx` allowed). The `DynamicFormRenderer` import uses the same long `@/app/console/...` path as `app/(front)/dynamicForm/page.tsx`.
- **API** only via `lib/api` wrappers.
- **React hooks v7 lint:** no `setState` synchronously in an effect body — use render-phase prev-value compare (depKey/prevKey pattern); no components/maps created during render; exhaustive-deps without disable.
- **TypeScript strict; no `any`; null-safe (`?? ""`, `?? []`).**
- **Decisions (locked with user):**
  - `taskForm.globalForm.fields[].value` = saved data (draft refill).
  - `permission` has HIGHER priority than the form's design config: `READONLY` = field disabled regardless of value; `HIDDEN` = hidden; `REQUIRED` = required (overrides field config).
  - 存草稿 relaxes required validation (collect data, NO validate); 发起 enforces validate.
  - `globalFormData` keys = `fieldId`.
  - Rendering the form is OPTIONAL — no bound form (流程未绑定 / 节点继承) → title-only.

## Key reference (already in repo, do not modify except linkage.ts)
- `DynamicFormRenderer` handle: `{ validate(): Record<string,string>; collectData(): Record<string,unknown>; clearEdgeTriggers(): void }`. `validate`/`collectData` skip `!visible || disabled` fields; `collectData` skips empty (`undefined/null/""`). Whole-form read-only = `disabled` prop + `onChange={() => {}}` + `errors={{}}` + `linkageRules=[]` (see `InstanceDetailView.tsx`).

---

### Task 1: 类型 + 字段级只读 hook (linkage.ts)

**Files:**
- Modify: `types/process.ts` (extend + add types)
- Modify: `app/console/form/dynamicForm-manager/_components/linkage.ts` (one hook in `computeFieldState`)

**Interfaces:**
- Consumes: `DynamicForm` (from `types/dynamic-form`, re-exported via `@/types`).
- Produces (used by Tasks 2–4):
  - `ProcessFieldPermission = "VISIBLE" | "READONLY" | "HIDDEN" | "REQUIRED"`
  - `ProcessFormField = DynamicFormField & { permission?: ProcessFieldPermission | null }`
  - `ProcessFormGroup = Omit<DynamicFormFieldGroup, "fields"> & { fields: ProcessFormField[] }`
  - `ProcessForm = Omit<DynamicForm, "fields" | "groups"> & { fields?: ProcessFormField[]; groups?: ProcessFormGroup[] }`
  - `TaskFormVO { globalForm?: ProcessForm }`
  - `ProcessStartInfo.startForm?: TaskFormVO`; `ProcessInstance.taskForm?: TaskFormVO`; `ProcessHandleParam.globalFormData?: Record<string, unknown>`
  - linkage: a field with `props.__processReadonly === true` yields `disabled: true` from `computeFieldState`.

- [ ] **Step 1: Extend `types/process.ts`.** Add `DynamicForm`, `DynamicFormField`, `DynamicFormFieldGroup` to the `import type { ... } from "@/types"` block at top (create one if absent — the file currently has no imports; add `import type { DynamicForm, DynamicFormField, DynamicFormFieldGroup } from "./dynamic-form";`). Then:
  - In `ProcessHandleParam`, add field: `globalFormData?: Record<string, unknown>;` with comment `/** 表单数据（键=fieldId；无表单省略） */`.
  - In `ProcessStartInfo`, add field: `startForm?: TaskFormVO;` with comment `/** 发起表单（流程未绑定/节点继承时缺省） */`.
  - In `ProcessInstance`, add field: `taskForm?: TaskFormVO;` with comment `/** 任务表单（含已存数据 value；无表单缺省） */`.
  - Append at end:

```typescript
// ===== 申请中心表单接入 =====

// 字段权限：VISIBLE 可见(默认) / READONLY 只读 / HIDDEN 隐藏 / REQUIRED 必填；空=VISIBLE。
// 优先级高于表单设计配置。
export type ProcessFieldPermission = "VISIBLE" | "READONLY" | "HIDDEN" | "REQUIRED";

// 流程表单字段：DynamicFormField + permission（+ value 回填，见 DynamicFormField.value）。
export type ProcessFormField = DynamicFormField & {
  permission?: ProcessFieldPermission | null;
};

// 流程表单分组：fields 换成 ProcessFormField。
export type ProcessFormGroup = Omit<DynamicFormFieldGroup, "fields"> & {
  fields: ProcessFormField[];
};

// 流程表单：DynamicForm 的 fields/groups 换成带 permission 的版本。
export type ProcessForm = Omit<DynamicForm, "fields" | "groups"> & {
  fields?: ProcessFormField[];
  groups?: ProcessFormGroup[];
};

// startInfo.startForm / processInstance.info.taskForm 包装。
export interface TaskFormVO {
  /** 全局表单（可能不存在：流程未绑定/节点继承） */
  globalForm?: ProcessForm;
}
```

- [ ] **Step 2: Add the readonly hook in `linkage.ts` `computeFieldState`.** Immediately AFTER the `const state: EffectiveFieldState = {...}` block and BEFORE `const relevant = ...`, insert:

```typescript
  // 流程字段级只读（permission=READONLY 注入的 __processReadonly）：强制禁用。
  // 优先级最高，先于联动规则求值。
  if (field.props?.__processReadonly === true) state.disabled = true;
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` clean. (If stale `.next/types` error, run `npx next typegen` first.)

- [ ] **Step 4: Commit**

```bash
git add types/process.ts "app/console/form/dynamicForm-manager/_components/linkage.ts"
git commit -m "feat(process): 表单接入类型（TaskFormVO/ProcessForm/permission）+ 字段级只读 hook"
```

---

### Task 2: ProcessForm 共享渲染组件

**Files:**
- Create: `app/(front)/process/application/_components/ProcessForm.tsx`

**Interfaces:**
- Consumes: `TaskFormVO`/`ProcessFormField` (Task 1), `DynamicFormRenderer` + `DynamicFormRendererHandle`.
- Produces (used by Tasks 3–4):
  - `hasProcessForm(form?: TaskFormVO): boolean`
  - `seedProcessFormValues(form?: TaskFormVO): Record<string, unknown>` — fieldId→`value`（仅 value!==undefined）
  - `ProcessFormFields({ form, readOnly, values, errors, onChange, rendererRef }: { form: TaskFormVO; readOnly?: boolean; values: Record<string, unknown>; errors: Record<string, string>; onChange: (fieldId: string, v: unknown) => void; rendererRef?: React.Ref<DynamicFormRendererHandle> })` — maps permission into cloned fields and renders `DynamicFormRenderer`. `readOnly` → whole-form `disabled` + no-op onChange + `errors={{}}` + `linkageRules=[]`.

- [ ] **Step 1: Create `ProcessForm.tsx`**

```typescript
"use client";

import type { Ref } from "react";
import {
  DynamicFormRenderer,
  type DynamicFormRendererHandle,
} from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";
import type {
  DynamicFormField,
  DynamicFormFieldGroup,
  TaskFormVO,
} from "@/types";

// 是否绑定了可渲染的表单（至少一个字段）。流程未绑定/节点继承 -> false，只发标题。
export function hasProcessForm(form?: TaskFormVO): boolean {
  const g = form?.globalForm;
  if (!g) return false;
  return (g.fields?.length ?? 0) > 0 || (g.groups?.length ?? 0) > 0;
}

// 初始值：字段 value 回填（草稿已存数据）。仅 value!==undefined 进。
export function seedProcessFormValues(
  form?: TaskFormVO,
): Record<string, unknown> {
  const g = form?.globalForm;
  const v: Record<string, unknown> = {};
  if (!g) return v;
  const all = [
    ...(g.fields ?? []),
    ...(g.groups ?? []).flatMap((gr) => gr.fields),
  ];
  for (const f of all) if (f.value !== undefined) v[f.fieldId] = f.value;
  return v;
}

// permission 映射进克隆字段（优先级高于表单设计配置）：
// HIDDEN -> visible:false；READONLY -> props.__processReadonly:true；REQUIRED -> required:"1"。
function applyPermission(f: DynamicFormField): DynamicFormField {
  const p = (f as { permission?: string | null }).permission;
  if (p === "HIDDEN") return { ...f, visible: false };
  if (p === "READONLY")
    return { ...f, props: { ...f.props, __processReadonly: true } };
  if (p === "REQUIRED") return { ...f, required: "1" };
  return f;
}

// 流程表单渲染：把 permission 映射进字段后用共享 DynamicFormRenderer。
// readOnly=整表只读（查看详情）。键=fieldId。
export function ProcessFormFields({
  form,
  readOnly,
  values,
  errors,
  onChange,
  rendererRef,
}: {
  form: TaskFormVO;
  readOnly?: boolean;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  rendererRef?: Ref<DynamicFormRendererHandle>;
}) {
  const g = form.globalForm;
  if (!g) return null;
  const fields: DynamicFormField[] = (g.fields ?? []).map(applyPermission);
  const groups: DynamicFormFieldGroup[] = (g.groups ?? []).map((gr) => ({
    ...gr,
    fields: gr.fields.map(applyPermission),
  }));
  return (
    <DynamicFormRenderer
      ref={rendererRef}
      fields={fields}
      groups={groups}
      linkageRules={readOnly ? [] : (g.linkageRules ?? [])}
      values={values}
      errors={readOnly ? {} : errors}
      onChange={readOnly ? () => {} : onChange}
      disabled={readOnly}
    />
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` + `npm run lint` clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(front)/process/application/_components/ProcessForm.tsx"
git commit -m "feat(process): ProcessForm 共享渲染（permission 映射 + seed + readOnly）"
```

---

### Task 3: StartView + EditView 接入表单（可编辑 + 提交）

**Files:**
- Modify: `app/(front)/process/application/_components/StartView.tsx`
- Modify: `app/(front)/process/application/_components/EditView.tsx`

**Interfaces:**
- Consumes: `hasProcessForm`/`seedProcessFormValues`/`ProcessFormFields` (Task 2), `DynamicFormRendererHandle`, `ProcessHandleParam.globalFormData`.
- Produces: StartView renders `startForm`, EditView renders `taskForm`; both submit `globalFormData` via the renderer's `collectData()`.

- [ ] **Step 1: `StartView.tsx`** — after fetching `info` (`ProcessStartInfo`, now has `startForm`):
  - Add state `const [values, setValues] = useState<Record<string, unknown>>({})`, `const [errors, setErrors] = useState<Record<string, string>>({})`, and `const rendererRef = useRef<DynamicFormRendererHandle>(null)`.
  - In the fetch `.then`, alongside `setInfo(data)`, also `setValues(seedProcessFormValues(data.startForm))`.
  - Compute `const showForm = hasProcessForm(info?.startForm);`
  - Render `{showForm && info?.startForm && (<div className="mt-6 max-w-3xl"><ProcessFormFields form={info.startForm} values={values} errors={errors} onChange={(id, v) => setValues((s) => ({ ...s, [id]: v }))} rendererRef={rendererRef} /></div>)}` between the title input block and the buttons.
  - Widen the title container from `max-w-md` to `max-w-3xl` for the form (keep buttons inside).
  - In `submit(kind)`:
    - If `showForm` and `kind === "start"`: `const errs = rendererRef.current?.validate() ?? {}; setErrors(errs); if (Object.keys(errs).length > 0) { toast.error("请完善表单必填项"); return; }`
    - Build `const globalFormData = showForm ? rendererRef.current?.collectData() ?? {} : undefined;`
    - Payload: `{ processDefinitionId: definitionId, title: title.trim() || undefined, ...(globalFormData ? { globalFormData } : {}) }`.
    - 存草稿 (`kind === "draft"`): NO validate; still collect `globalFormData`.

- [ ] **Step 2: `EditView.tsx`** — same wiring against `taskForm`:
  - In the fetch `.then`, alongside existing `setTitle(data.title ?? "")` etc., `setValues(seedProcessFormValues(data.taskForm))` and store the form (`const [form, setForm] = useState<TaskFormVO | undefined>(undefined); setForm(data.taskForm)`).
  - `const showForm = hasProcessForm(form);` render `ProcessFormFields` (not readOnly) below the title input.
  - `submit(kind)`: same validate-on-start / collect logic; payload `{ processDefinitionId: definitionId, processInstanceId: instanceId, title: title.trim() || undefined, ...(globalFormData ? { globalFormData } : {}) }`.
  - Widen container to `max-w-3xl`.

- [ ] **Step 3: Verify** `npx tsc --noEmit` + `npm run lint` clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(front)/process/application/_components/StartView.tsx" "app/(front)/process/application/_components/EditView.tsx"
git commit -m "feat(process): 发起/编辑接入表单（渲染 + 校验 + globalFormData 提交；存草稿放宽必填）"
```

---

### Task 4: DetailView 只读渲染 + 全量构建

**Files:**
- Modify: `app/(front)/process/application/_components/DetailView.tsx`

**Interfaces:**
- Consumes: `hasProcessForm`/`seedProcessFormValues`/`ProcessFormFields` (Task 2).
- Produces: DetailView read-only renders `taskForm` with saved values.

- [ ] **Step 1: `DetailView.tsx`** — after fetching `detail`:
  - `const showForm = hasProcessForm(detail?.taskForm);`
  - Compute `const formValues = seedProcessFormValues(detail?.taskForm);` (no state needed — read-only).
  - Below the detail `<dl>`, render `{showForm && detail?.taskForm && (<div className="mt-8"><h2 className="mb-3 text-sm font-medium text-muted-foreground">表单</h2><ProcessFormFields form={detail.taskForm} readOnly values={formValues} errors={{}} onChange={() => {}} /></div>)}`.
  - Widen the read container from `max-w-md` to `max-w-3xl`.

- [ ] **Step 2: Verify** `npx tsc --noEmit` + `npm run lint` clean, then `npm run build` (static export; `/process/application` exported).

- [ ] **Step 3: Commit**

```bash
git add "app/(front)/process/application/_components/DetailView.tsx"
git commit -m "feat(process): 查看详情只读渲染表单（taskForm + 已存数据回填）"
```

---

## Self-Review Notes

- **Spec coverage:** startInfo `startForm` + info `taskForm` types (Task 1); `globalFormData` in start/saveDraft (Task 1 type + Task 3 submit); permission VISIBLE/READONLY/HIDDEN/REQUIRED with priority over design config (Task 1 linkage hook + Task 2 `applyPermission`); READONLY disabled regardless of value (linkage hook forces `disabled:true`, which makes validate/collectData skip it and RendererField disable it); 存草稿放宽 / 发起强制 (Task 3 validate-on-start only); keys=fieldId (Task 2/3 collectData); form optional (Task 2 `hasProcessForm`, views fall back to title-only); edit refill via `value` (Task 2 `seedProcessFormValues`); detail read-only (Task 4). All covered.
- **Placeholder scan:** none — full code for the new shared component and the linkage hook; view edits are concrete and specific.
- **Type consistency:** `TaskFormVO.globalForm: ProcessForm`; `ProcessFormField/Group` used only at the view-mapping boundary (`applyPermission` reads `permission` via a cast and returns plain `DynamicFormField`/`DynamicFormFieldGroup` for the renderer, which doesn't know `permission`); `ProcessHandleParam.globalFormData` matches submit payload. `validate/collectData` signatures match the real renderer handle.

# 动态表单联动规则 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给动态表单设计器加联动规则——字段值满足条件时动态改变其他字段的显隐/必填/选项/值/正则/宽度/禁用，含右侧 Tab 规则管理 + 宽弹窗编辑器 + 预览运行时求值。

**Architecture:** 扁平条件组（1 AND/OR 根 + N CONDITION 子，嵌套 children，不管 id/parentId）。纯函数求值引擎 `linkage.ts`（evalCondition/evalRule/computeFieldState），预览渲染前每字段过 `computeFieldState` 得有效状态；VALUE 边沿触发赋一次。右侧「字段配置|联动规则」Tab + 规则卡片列表 + 宽弹窗编辑器。

**Tech Stack:** Next.js 16 static export / React 19 / TS strict / Tailwind v4 / shadcn (Tabs/Badge/Switch/Select/Dialog/Slider/Input/Label/Button/Checkbox)。

## Global Constraints

- 项目**无单测基建**（无 vitest/jest）：求值引擎用**临时校验脚本**（`npx tsx <file>` 跑断言，验证后删除）+ 浏览器预览手测，不引入测试框架。
- 每个任务结束跑 `npx tsc --noEmit`（无输出=通过）；改动 UI 的任务再跑 `npm run lint`。
- `pathKey` 用 `p.join("")`（不可见分隔符，避免 `/` 冲突）。
- 类型集中 `types/dynamic-form.ts`，经 `types/index.ts` `export *` 自动透出，`import ... from "@/types"`。
- 扁平 conditionTree：`conditionTree = [{ nodeType:"AND"|"OR", children:[CONDITION...] }]`；嵌套 children，**不读不写 id/parentId**（后端自动算）。
- 条件满足才执行动作；不满足按字段原配置。例外：SHOW 不满足=隐藏、HIDE 不满足=显示（互为反义）。
- VALUE 赋值=**仅触发瞬间赋一次**（条件由不满足→满足的边沿）。
- 隐藏/禁用字段：保留值、不校验、不进「查看数据」。
- 提交/校验命令：`npx tsc --noEmit`（type-check）；`npm run lint`（eslint）。提交信息结尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。

---

### Task 1: 类型定义（types/dynamic-form.ts）

**Files:**
- Modify: `types/dynamic-form.ts`（追加联动类型 + DynamicForm/SavePayload 加 linkageRules）

**Interfaces:**
- Produces: `DynamicFormLinkageActionType`、`DynamicFormLinkageCondition`、`DynamicFormLinkageNode`、`DynamicFormLinkageRule`；`DynamicForm.linkageRules?`、`DynamicFormSavePayload.linkageRules?`（后续所有任务依赖这些类型）。

- [ ] **Step 1: 追加联动类型**

在 `types/dynamic-form.ts` 末尾追加：

```ts
// ---- 联动规则（linkageRules，add/update/info 的 data 内）----

// 动作类型。
export type DynamicFormLinkageActionType =
  | "SHOW" // 显示（不满足→隐藏）
  | "HIDE" // 隐藏（不满足→显示）
  | "REQUIRED" // 必填（不满足→按原 required）
  | "OPTION" // 设置选项
  | "VALUE" // 设置值（仅触发瞬间赋一次）
  | "DISABLED" // 禁用
  | "ENABLED" // 启用
  | "SET_PATTERN" // 设置正则
  | "SET_SPAN"; // 设置宽度

// 条件操作符。
export type DynamicFormLinkageCondition =
  | "EQ" | "NE" // 等于/不等于（数组字段=包含）
  | "GT" | "LT" | "GE" | "LE" // 数值比较
  | "IN" | "NOT_IN" // 值在/不在 triggerValue 数组内
  | "EMPTY" | "NOT_EMPTY" // 为空/非空
  | "REGEX"; // 正则匹配

// 条件节点。扁平条件组：1 个 AND/OR 根 + N 个 CONDITION 子（嵌套 children，不读 id/parentId）。
export interface DynamicFormLinkageNode {
  id?: string; // 后端返回（编辑回显原样带回）
  nodeType: "AND" | "OR" | "CONDITION";
  triggerFieldId?: string; // 仅 CONDITION
  triggerCondition?: DynamicFormLinkageCondition; // 仅 CONDITION
  triggerValue?: unknown; // 仅 CONDITION（IN/NOT_IN 为数组）
  sortOrder?: number;
  children?: DynamicFormLinkageNode[];
}

// 联动规则。
export interface DynamicFormLinkageRule {
  id?: string; // 后端返回
  name: string;
  targetFieldId: string;
  actionType: DynamicFormLinkageActionType;
  actionValue?: unknown; // OPTION=DynamicFormOption[] / VALUE=值 / SET_PATTERN=正则串 / SET_SPAN=1-24
  enable: boolean; // true=启用 / false=禁用
  sortOrder?: number;
  conditionTree: DynamicFormLinkageNode[]; // 扁平：[AND/OR根]
}
```

- [ ] **Step 2: DynamicForm/SavePayload 加 linkageRules**

`DynamicForm` 接口（`status` 字段后）加一行；`DynamicFormSavePayload` 接口（`groups` 字段后）加一行：

```ts
  linkageRules?: DynamicFormLinkageRule[]; // 联动规则
```

- [ ] **Step 3: 校验 + 提交**

Run: `npx tsc --noEmit`（无输出=通过）
```bash
git add types/dynamic-form.ts
git commit -m "feat: 动态表单联动规则类型定义

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 求值引擎 linkage.ts + 临时校验脚本

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/linkage.ts`
- Create（临时，验证后删）: `app/console/form/dynamicForm-manager/_components/linkage.check.ts`

**Interfaces:**
- Consumes: Task 1 的联动类型、`DynamicFormField`、`DynamicFormOption`（`@/types`）。
- Produces:
  - `evalCondition(node: DynamicFormLinkageNode, values: Record<string, unknown>): boolean`
  - `evalRule(rule: DynamicFormLinkageRule, values: Record<string, unknown>): boolean`
  - `interface EffectiveFieldState { visible: boolean; required: "0"|"1"; disabled: boolean; options?: DynamicFormOption[]; pattern?: string; span?: number }`
  - `computeFieldState(field: DynamicFormField, rules: DynamicFormLinkageRule[], values: Record<string, unknown>): EffectiveFieldState`
  - `findValueRule(rule: DynamicFormLinkageRule): boolean`（是 VALUE 且 enable）

- [ ] **Step 1: 写 linkage.ts**

```ts
import type {
  DynamicFormField,
  DynamicFormLinkageNode,
  DynamicFormLinkageRule,
  DynamicFormOption,
} from "@/types";

// 联动规则求值引擎（纯函数，无 React 依赖，可独立校验）。
// 扁平条件组：conditionTree = [AND/OR 根]，根.children = CONDITION 子节点。
// 语义：条件满足才执行动作，不满足按字段原配置（SHOW/HIDE 反义例外）。

// 字段当前值（外部已做 defaultValue 回退）。
type Values = Record<string, unknown>;

function isEmptyValue(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

// 单条件求值。
export function evalCondition(node: DynamicFormLinkageNode, values: Values): boolean {
  const fieldVal = node.triggerFieldId ? values[node.triggerFieldId] : undefined;
  const cond = node.triggerCondition;
  const target = node.triggerValue;
  switch (cond) {
    case "EMPTY":
      return isEmptyValue(fieldVal);
    case "NOT_EMPTY":
      return !isEmptyValue(fieldVal);
    case "EQ":
      // 数组字段值=包含该值；否则严格相等。
      return Array.isArray(fieldVal) ? fieldVal.includes(target) : fieldVal === target;
    case "NE":
      return Array.isArray(fieldVal) ? !fieldVal.includes(target) : fieldVal !== target;
    case "GT":
      return num(fieldVal) != null && num(target) != null && num(fieldVal)! > num(target)!;
    case "LT":
      return num(fieldVal) != null && num(target) != null && num(fieldVal)! < num(target)!;
    case "GE":
      return num(fieldVal) != null && num(target) != null && num(fieldVal)! >= num(target)!;
    case "LE":
      return num(fieldVal) != null && num(target) != null && num(fieldVal)! <= num(target)!;
    case "IN": {
      if (!Array.isArray(target)) return false;
      return Array.isArray(fieldVal)
        ? fieldVal.some((x) => target.includes(x))
        : target.includes(fieldVal);
    }
    case "NOT_IN": {
      if (!Array.isArray(target)) return false;
      return Array.isArray(fieldVal)
        ? !fieldVal.some((x) => target.includes(x))
        : !target.includes(fieldVal);
    }
    case "REGEX": {
      if (typeof fieldVal !== "string" || typeof target !== "string") return false;
      try {
        return new RegExp(target).test(fieldVal);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function num(v: unknown): number | null {
  const n = Number(v);
  return v == null || v === "" || Number.isNaN(n) ? null : n;
}

// 规则求值：根 AND（全真）/OR（任一真）聚合 children；空 children=恒真。
export function evalRule(rule: DynamicFormLinkageRule, values: Values): boolean {
  const root = rule.conditionTree?.[0];
  const conds = (root?.children ?? []).filter((n) => n.nodeType === "CONDITION");
  if (!root || conds.length === 0) return true; // 无条件=恒真
  const results = conds.map((n) => evalCondition(n, values));
  return root.nodeType === "OR" ? results.some(Boolean) : results.every(Boolean);
}

// 字段有效状态：汇总所有作用于该字段的启用规则叠加（sortOrder 升序，后命中覆盖先命中）。
export interface EffectiveFieldState {
  visible: boolean;
  required: "0" | "1";
  disabled: boolean;
  options?: DynamicFormOption[];
  pattern?: string;
  span?: number;
}

export function computeFieldState(
  field: DynamicFormField,
  rules: DynamicFormLinkageRule[],
  values: Values,
): EffectiveFieldState {
  const state: EffectiveFieldState = {
    visible: true,
    required: field.required === "1" ? "1" : "0",
    disabled: false,
    options: field.options,
    pattern: field.pattern,
    span: field.span,
  };
  const relevant = rules
    .filter((r) => r.enable && r.targetFieldId === field.fieldId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const rule of relevant) {
    const hit = evalRule(rule, values);
    switch (rule.actionType) {
      case "SHOW":
        state.visible = hit;
        break;
      case "HIDE":
        state.visible = !hit;
        break;
      case "REQUIRED":
        if (hit) state.required = "1";
        break;
      case "DISABLED":
        if (hit) state.disabled = true;
        break;
      case "ENABLED":
        if (hit) state.disabled = false;
        break;
      case "OPTION":
        if (hit && Array.isArray(rule.actionValue)) {
          state.options = rule.actionValue as DynamicFormOption[];
        }
        break;
      case "SET_PATTERN":
        if (hit && typeof rule.actionValue === "string") state.pattern = rule.actionValue;
        break;
      case "SET_SPAN":
        if (hit && typeof rule.actionValue === "number") state.span = rule.actionValue;
        break;
      case "VALUE":
        break; // VALUE 走边沿触发（useLinkageValues），不参与状态叠加
    }
  }
  return state;
}

// 是否 VALUE 规则（供触发瞬间赋值筛选用）。
export function findValueRule(rule: DynamicFormLinkageRule): boolean {
  return rule.enable && rule.actionType === "VALUE";
}
```

- [ ] **Step 2: 写临时校验脚本 linkage.check.ts**

```ts
// 临时校验脚本：npx tsx linkage.check.ts 跑断言，验证后删除（项目无单测框架）。
import { evalCondition, evalRule, computeFieldState } from "./linkage";
import type { DynamicFormLinkageNode, DynamicFormLinkageRule, DynamicFormField } from "@/types";

let failed = 0;
function eq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failed++;
    console.error(`FAIL ${label}: got`, actual, "want", expected);
  } else {
    console.log(`ok ${label}`);
  }
}

const cond = (over: Partial<DynamicFormLinkageNode>): DynamicFormLinkageNode => ({
  nodeType: "CONDITION",
  triggerFieldId: "a",
  ...over,
});
const rule = (over: Partial<DynamicFormLinkageRule>): DynamicFormLinkageRule => ({
  name: "r",
  targetFieldId: "b",
  actionType: "SHOW",
  enable: true,
  conditionTree: [{ nodeType: "AND", children: [] }],
  ...over,
});
const field = (over: Partial<DynamicFormField>): DynamicFormField => ({
  fieldId: "b",
  title: "B",
  type: "INPUT",
  ...over,
});

// evalCondition
eq(evalCondition(cond({ triggerCondition: "EQ", triggerValue: "x" }), { a: "x" }), true, "EQ 单值");
eq(evalCondition(cond({ triggerCondition: "EQ", triggerValue: "x" }), { a: ["x", "y"] }), true, "EQ 数组包含");
eq(evalCondition(cond({ triggerCondition: "NE", triggerValue: "x" }), { a: "y" }), true, "NE");
eq(evalCondition(cond({ triggerCondition: "GT", triggerValue: 18 }), { a: 20 }), true, "GT");
eq(evalCondition(cond({ triggerCondition: "GT", triggerValue: 18 }), { a: 18 }), false, "GT 边界");
eq(evalCondition(cond({ triggerCondition: "LE", triggerValue: 18 }), { a: 18 }), true, "LE 边界");
eq(evalCondition(cond({ triggerCondition: "IN", triggerValue: ["x", "z"] }), { a: "x" }), true, "IN 单值");
eq(evalCondition(cond({ triggerCondition: "IN", triggerValue: ["x", "z"] }), { a: ["y", "z"] }), true, "IN 数组相交");
eq(evalCondition(cond({ triggerCondition: "EMPTY" }), { a: "" }), true, "EMPTY 空串");
eq(evalCondition(cond({ triggerCondition: "EMPTY" }), { a: [] }), true, "EMPTY 空数组");
eq(evalCondition(cond({ triggerCondition: "NOT_EMPTY" }), { a: "v" }), true, "NOT_EMPTY");
eq(evalCondition(cond({ triggerCondition: "REGEX", triggerValue: "^\\d+$" }), { a: "123" }), true, "REGEX 命中");
eq(evalCondition(cond({ triggerCondition: "REGEX", triggerValue: "^\\d+$" }), { a: "abc" }), false, "REGEX 不中");

// evalRule AND/OR
eq(evalRule(rule({ conditionTree: [{ nodeType: "AND", children: [
  cond({ triggerCondition: "EQ", triggerValue: "x" }),
  { nodeType: "CONDITION", triggerFieldId: "c", triggerCondition: "GT", triggerValue: 18 },
] }] }), { a: "x", c: 20 }), true, "AND 全真");
eq(evalRule(rule({ conditionTree: [{ nodeType: "AND", children: [
  cond({ triggerCondition: "EQ", triggerValue: "x" }),
  { nodeType: "CONDITION", triggerFieldId: "c", triggerCondition: "GT", triggerValue: 18 },
] }] }), { a: "x", c: 10 }), false, "AND 一假");
eq(evalRule(rule({ conditionTree: [{ nodeType: "OR", children: [
  cond({ triggerCondition: "EQ", triggerValue: "x" }),
  { nodeType: "CONDITION", triggerFieldId: "c", triggerCondition: "GT", triggerValue: 18 },
] }] }), { a: "y", c: 20 }), true, "OR 一真");
eq(evalRule(rule({ conditionTree: [] }), {}), true, "无条件恒真");

// computeFieldState
eq(computeFieldState(field({}), [rule({ actionType: "SHOW", conditionTree: [{ nodeType: "AND", children: [cond({ triggerCondition: "EQ", triggerValue: "x" })] }] })], { a: "no" }).visible, false, "SHOW 不满足隐藏");
eq(computeFieldState(field({}), [rule({ actionType: "SHOW", conditionTree: [{ nodeType: "AND", children: [cond({ triggerCondition: "EQ", triggerValue: "x" })] }] })], { a: "x" }).visible, true, "SHOW 满足显示");
eq(computeFieldState(field({}), [rule({ actionType: "HIDE", conditionTree: [{ nodeType: "AND", children: [cond({ triggerCondition: "EQ", triggerValue: "x" })] }] })], { a: "x" }).visible, false, "HIDE 满足隐藏");
eq(computeFieldState(field({ required: "0" }), [rule({ actionType: "REQUIRED", conditionTree: [] })], {}).required, "1", "REQUIRED 命中");
eq(computeFieldState(field({}), [rule({ actionType: "SET_SPAN", actionValue: 12, conditionTree: [] })], {}).span, 12, "SET_SPAN");
eq(computeFieldState(field({}), [rule({ actionType: "SET_PATTERN", actionValue: "^a", conditionTree: [] })], {}).pattern, "^a", "SET_PATTERN");
eq(computeFieldState(field({}), [rule({ actionType: "OPTION", actionValue: [{ label: "L", value: "v" }], conditionTree: [] })], {}).options?.length, 1, "OPTION");
eq(computeFieldState(field({}), [rule({ actionType: "DISABLED", conditionTree: [] })], {}).disabled, true, "DISABLED");
eq(computeFieldState(field({}), [rule({ enable: false, actionType: "SHOW", conditionTree: [] })], {}).visible, true, "禁用规则跳过");

if (failed === 0) console.log("\nALL PASS");
else { console.error(`\n${failed} FAILED`); process.exit(1); }
```

- [ ] **Step 3: 跑校验脚本**

Run: `npx tsx app/console/form/dynamicForm-manager/_components/linkage.check.ts`
Expected: 全 `ok ...` + `ALL PASS`（有 FAIL 修 linkage.ts）

- [ ] **Step 4: 删临时脚本 + 校验 + 提交**

```bash
rm app/console/form/dynamicForm-manager/_components/linkage.check.ts
npx tsc --noEmit
git add app/console/form/dynamicForm-manager/_components/linkage.ts
git commit -m "feat: 联动规则求值引擎 linkage.ts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: designer-state 加 linkageRules 状态

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/designer-state.ts`

**Interfaces:**
- Consumes: Task 1 类型。
- Produces: `DesignerState.linkageRules: DynamicFormLinkageRule[]`；hook 返回新增 `addRule(rule)`、`updateRule(index, rule)`、`removeRule(index)`、`moveRule(from, to)`；`stateFromForm`/`emptyState`/`toPayload` 带 linkageRules（Task 5 的 LinkagePanel 依赖这些方法名）。

- [ ] **Step 1: DesignerState + emptyState + stateFromForm**

`designer-state.ts` 顶部 import 加类型：

```ts
import type {
  DynamicForm,
  DynamicFormField,
  DynamicFormFieldGroup,
  DynamicFormLinkageRule,
  DynamicFormSavePayload,
} from "@/types";
```

`DesignerState` 接口加字段：

```ts
export interface DesignerState {
  name: string;
  description: string;
  fields: DynamicFormField[]; // 未分组
  groups: DynamicFormFieldGroup[];
  linkageRules: DynamicFormLinkageRule[]; // 联动规则
}
```

`emptyState()` 改为：

```ts
export function emptyState(): DesignerState {
  return { name: "", description: "", fields: [], groups: [], linkageRules: [] };
}
```

`stateFromForm()` return 对象加一行：

```ts
    linkageRules: (form.linkageRules ?? []).map((r) => ({ ...r })),
```

`toPayload()` return 对象加一行：

```ts
    linkageRules: s.linkageRules,
```

- [ ] **Step 2: hook 加规则操作**

`useDesignerState` 内（`moveGroup` 之后）加：

```ts
  // ---- 联动规则 ----
  const addRule = useCallback((rule: DynamicFormLinkageRule) => {
    setState((s) => ({ ...s, linkageRules: [...s.linkageRules, rule] }));
  }, []);

  const updateRule = useCallback((index: number, rule: DynamicFormLinkageRule) => {
    setState((s) => ({
      ...s,
      linkageRules: s.linkageRules.map((r, i) => (i === index ? rule : r)),
    }));
  }, []);

  const removeRule = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      linkageRules: s.linkageRules.filter((_, i) => i !== index),
    }));
  }, []);

  const moveRule = useCallback((from: number, to: number) => {
    setState((s) => {
      const arr = [...s.linkageRules];
      const [r] = arr.splice(from, 1);
      arr.splice(Math.max(0, Math.min(arr.length, to)), 0, r);
      return { ...s, linkageRules: arr.map((x, i) => ({ ...x, sortOrder: i })) };
    });
  }, []);
```

return 对象加 `addRule, updateRule, removeRule, moveRule,`。

- [ ] **Step 3: 校验 + 提交**

Run: `npx tsc --noEmit`
```bash
git add app/console/form/dynamicForm-manager/_components/designer-state.ts
git commit -m "feat: designer-state 支持联动规则增删改排序

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: 规则编辑器 LinkageRuleEditor（宽弹窗）

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/LinkageRuleEditor.tsx`

**Interfaces:**
- Consumes: Task 1 类型、`DynamicFormField`、`FIELD_REGISTRY`/`createField`（`./fields/registry`）、`OptionsEditor`（`./OptionsEditor`）、`visibleOptions`（`./fields/CascaderControl`）、shadcn（Dialog/Select/Input/Button/Label/Slider）。
- Produces: `LinkageRuleEditor({ open, onClose, fields, initial, onSave })`；`initial?: { index: number; rule: DynamicFormLinkageRule } | null`；`onSave(index: number | null, rule: DynamicFormLinkageRule): void`。另导出 helper（Task 5 复用）：`ACTION_LABEL`、`COND_LABEL`、`actionNeedsValue(at)`、`ruleSummary(rule, fieldTitle)`。
- 导出名对齐：`import { FIELD_REGISTRY }`（非 FIELD_META）；`visibleOptions` 来自 `./fields/CascaderControl`。

- [ ] **Step 1: 写 LinkageRuleEditor.tsx**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
  useEffect(() => {
    if (open) setRule(initial?.rule ?? emptyRule());
  }, [open, initial]);

  const fieldTitle = useMemo(() => {
    const map = new Map(fields.map((f) => [f.fieldId, f.title]));
    return (id: string) => map.get(id) ?? id;
  }, [fields]);
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
```

- [ ] **Step 2: 校验 + lint + 提交**

Run: `npx tsc --noEmit` 然后 `npm run lint`
```bash
git add app/console/form/dynamicForm-manager/_components/LinkageRuleEditor.tsx
git commit -m "feat: 联动规则编辑器弹窗（条件区+动作区）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: 规则列表面板 LinkagePanel

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/LinkagePanel.tsx`

**Interfaces:**
- Consumes: Task 3 `DesignerApi`（`state.linkageRules`/`addRule`/`updateRule`/`removeRule`/`moveRule`）；Task 4 `LinkageRuleEditor`/`emptyRule`/`ruleSummary`。
- Produces: `LinkagePanel({ designer })`（Task 6 的 FormDesigner 用它，`designer: DesignerApi`）。

- [ ] **Step 1: 写 LinkagePanel.tsx**

```tsx
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { DynamicFormLinkageRule } from "@/types";
import { LinkageRuleEditor, ruleSummary } from "./LinkageRuleEditor";
import type { DesignerApi } from "./designer-state";

// 联动规则面板：规则卡片列表（摘要 + 启用开关 + 上下排序 + 编辑/删除）+ 新建。
// 编辑走 LinkageRuleEditor 宽弹窗。
export function LinkagePanel({ designer }: { designer: DesignerApi }) {
  const { state, addRule, updateRule, removeRule, moveRule } = designer;
  const rules = state.linkageRules;
  const allFields = [...state.fields, ...state.groups.flatMap((g) => g.fields)];
  const fieldTitle = (id: string) => allFields.find((f) => f.fieldId === id)?.title ?? id;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ index: number; rule: DynamicFormLinkageRule } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(index: number) {
    setEditing({ index, rule: rules[index] });
    setEditorOpen(true);
  }
  function handleSave(index: number | null, rule: DynamicFormLinkageRule) {
    if (index == null) addRule({ ...rule, sortOrder: rules.length });
    else updateRule(index, rule);
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">联动规则（{rules.length}）</span>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 新建规则
        </Button>
      </div>

      {rules.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">
          还没有联动规则，点右上「新建规则」添加。
        </p>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((r, i) => (
          <div key={r.id ?? i} className={cn("rounded-md border bg-surface p-2.5", !r.enable && "opacity-60")}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name || "未命名规则"}</span>
              <Badge variant={r.enable ? "default" : "secondary"} className="shrink-0">
                {r.enable ? "启用" : "停用"}
              </Badge>
              <Switch
                checked={r.enable}
                onCheckedChange={(c) => updateRule(i, { ...r, enable: c })}
                aria-label="启用/停用"
              />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {ruleSummary(r, fieldTitle)}
            </p>
            <div className="mt-2 flex items-center gap-1">
              <Button
                type="button" variant="ghost" size="icon" className="h-7 w-7"
                disabled={i === 0} onClick={() => moveRule(i, i - 1)} aria-label="上移"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" variant="ghost" size="icon" className="h-7 w-7"
                disabled={i === rules.length - 1} onClick={() => moveRule(i, i + 1)} aria-label="下移"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-brand"
                  onClick={() => openEdit(i)} aria-label="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleting(i)} aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <LinkageRuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fields={allFields}
        initial={editing}
        onSave={handleSave}
      />

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除规则</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除规则「{deleting != null ? rules[deleting]?.name : ""}」吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting != null) removeRule(deleting);
                setDeleting(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: 校验 + lint + 提交**

Run: `npx tsc --noEmit` 然后 `npm run lint`
```bash
git add app/console/form/dynamicForm-manager/_components/LinkagePanel.tsx
git commit -m "feat: 联动规则列表面板（卡片+排序+启删）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: FormDesigner 右侧加 Tab（字段配置 | 联动规则）

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/FormDesigner.tsx`（右栏改 Tabs）

**Interfaces:**
- Consumes: Task 5 `LinkagePanel`、现有 `FieldConfigPanel`、shadcn `Tabs/TabsList/TabsTrigger/TabsContent`。

- [ ] **Step 1: import Tabs + LinkagePanel**

`FormDesigner.tsx` import 区加：

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkagePanel } from "./LinkagePanel";
```

- [ ] **Step 2: 右栏改 Tabs**

把现有右栏（约 178-184 行的 `<div className="w-72 shrink-0 ...">` 整段）替换为：

```tsx
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-surface">
          <Tabs defaultValue="field" className="flex h-full flex-col">
            <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
              <TabsTrigger value="field">字段配置</TabsTrigger>
              <TabsTrigger value="linkage">联动规则</TabsTrigger>
            </TabsList>
            <TabsContent value="field" className="min-h-0 flex-1 overflow-y-auto">
              <FieldConfigPanel
                field={selectedField}
                onChange={(patch) => selectedId && designer.updateField(selectedId, patch)}
              />
            </TabsContent>
            <TabsContent value="linkage" className="min-h-0 flex-1 overflow-hidden">
              <LinkagePanel designer={designer} />
            </TabsContent>
          </Tabs>
        </div>
```

- [ ] **Step 3: 校验 + lint + 手测 + 提交**

Run: `npx tsc --noEmit` 然后 `npm run lint`

手测（`npm run dev` → `/console/form/dynamicForm-manager` → 新建/编辑表单）：
- 右侧出现「字段配置 | 联动规则」两个 Tab；字段配置仍正常。
- 联动规则 Tab：新建规则 → 弹窗填名称/条件/动作 → 保存出现在列表；编辑/删除/上下移/启停开关生效；刷新（编辑已存表单）规则回显。

```bash
git add app/console/form/dynamicForm-manager/_components/FormDesigner.tsx
git commit -m "feat: 设计器右侧加联动规则 Tab

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: 预览运行时接入（FormPreviewDialog + validate）

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/validate.ts`
- Modify: `app/console/form/dynamicForm-manager/_components/FormPreviewDialog.tsx`

**Interfaces:**
- Consumes: Task 2 `computeFieldState`/`evalRule`/`findValueRule`/`EffectiveFieldState`、Task 1 类型。
- Produces: `validateFieldState(field, state, value): string | null`（validate.ts 新增，FormPreviewDialog 用；`validateField` 保留兼容）。

- [ ] **Step 1: validate.ts 加 validateFieldState**

`validate.ts` 顶部 import 改为同时引入联动类型；文件内新增导出（放 `validateField` 之后）：

```ts
import type { DynamicFormField } from "@/types";
import type { EffectiveFieldState } from "./linkage";
import { FIELD_REGISTRY } from "./fields/registry";
```

新增：

```ts
// 按联动后的有效状态校验：required/pattern 取有效状态（覆盖字段原配置）。
export function validateFieldState(
  field: DynamicFormField,
  state: EffectiveFieldState,
  value: unknown,
): string | null {
  return validateField({ ...field, required: state.required, pattern: state.pattern }, value);
}
```

- [ ] **Step 2: FormPreviewDialog 接入 computeFieldState + VALUE 触发**

`FormPreviewDialog.tsx` import 区加：

```tsx
import { useEffect, useRef, useState } from "react";
import { computeFieldState, evalRule, findValueRule, type EffectiveFieldState } from "./linkage";
```

（现有 `useState` import 若已存在则合并，避免重复 import。）

组件内 `valueOf` 之后加：

```tsx
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
    const values = currentValues();
    for (const rule of rules) {
      if (!findValueRule(rule)) continue;
      const key = rule.id ?? `${rule.targetFieldId}:${rule.name}`;
      const hit = evalRule(rule, values);
      const prev = valueRulePrev.current.get(key) ?? false;
      if (hit && !prev) setValue(rule.targetFieldId, rule.actionValue);
      valueRulePrev.current.set(key, hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);
```

（`values` 即现有 `useState` 的 values，effect 依赖它——值变化时重新检测边沿。）

`submit()` 里校验循环改为跳过隐藏/禁用 + 用有效状态：

```tsx
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
    if (count === 0) toast.success("校验通过");
    else toast.error(`${count} 个字段校验未通过`);
  }
```

`collectData()` 加隐藏/禁用过滤：

```tsx
  function collectData() {
    const data: Record<string, unknown> = {};
    for (const f of allFields) {
      const st = effState.get(f.fieldId);
      if (!st || !st.visible || st.disabled) continue; // 隐藏/禁用不进数据
      const v = valueOf(f);
      if (v === undefined || v === null || v === "") continue;
      data[f.fieldId] = v;
    }
    return data;
  }
```

`PreviewField` 渲染处（map 内）改为按有效状态渲染：visible=false 返回 null，disabled/options/pattern/span 透传：

```tsx
          {fields.map((f) => {
            const st = effState.get(f.fieldId);
            if (!st || !st.visible) return null;
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
```

`PreviewField` 组件签名加 `disabled` 并透传给 Control：

```tsx
function PreviewField({
  field, value, error, onChange, disabled,
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

`PreviewGroup` 需把 `effState` 透传（在 FormPreviewDialog 里算好，作为 prop 传入两个 PreviewGroup）：

```tsx
// PreviewGroup props 加：effState: Map<string, EffectiveFieldState>
// PreviewGroup 内 fields.map 用上面的 effState 渲染逻辑。
```

import 加 `validateFieldState`（替换/并列 `validateField`）：

```tsx
import { validateFieldState } from "./validate";
```

- [ ] **Step 3: 校验 + lint + 手测 + 提交**

Run: `npx tsc --noEmit` 然后 `npm run lint`

手测（预览里）：
- 显隐：RADIO「是否已婚」→ 规则 SHOW「配偶姓名」（条件 已婚=是）。预览切「是」显示、切「否」隐藏；隐藏后重置/提交不校验它、查看数据不含它。
- 必填：REQUIRED 规则命中时目标字段出现 `*` 且空值提交报错。
- 赋值：VALUE 规则——触发字段切到满足值时目标被赋一次（之后再改目标不被覆盖）。
- 选项：OPTION 规则命中时目标下拉选项被替换。
- 宽度/正则：SET_SPAN 命中改宽、SET_PATTERN 命中按新正则校验。

```bash
git add app/console/form/dynamicForm-manager/_components/validate.ts app/console/form/dynamicForm-manager/_components/FormPreviewDialog.tsx
git commit -m "feat: 预览接入联动规则求值（显隐/必填/赋值/选项/正则/宽度）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: 端到端验证 + 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`（动态表单条目加联动规则段落）

- [ ] **Step 1: 全量构建验证**

Run: `npm run build`
Expected: 构建成功（static export 到 out/，同时 type-check），无报错。

- [ ] **Step 2: 端到端手测（保存链路）**

`npm run dev` → `/console/form/dynamicForm-manager`：
- 新建表单，加几个字段 + 2 条联动规则，保存；回列表重进编辑，规则回显正确（嵌套 children、enable、actionValue 都在）。
- 预览按 Task 7 手测点全过一遍。

- [ ] **Step 3: 更新 CLAUDE.md**

在动态表单设计器条目末尾追加一段：

```markdown
  - **联动规则**（v3，`linkageRules` 随 add/update/info 走）：扁平条件组（1 AND/OR 根 + N CONDITION 子，嵌套 children 不读 id/parentId，后端自动算 id）。9 动作 SHOW/HIDE/REQUIRED/OPTION/VALUE/DISABLED/ENABLED/SET_PATTERN/SET_SPAN，条件满足才执行、不满足按原配置（SHOW/HIDE 反义例外）。求值引擎 `linkage.ts`（`evalCondition`/`evalRule`/`computeFieldState` 纯函数）；预览每字段过 `computeFieldState` 得有效状态（visible/required/disabled/options/pattern/span），隐藏/禁用字段保留值、不校验、不进查看数据；VALUE 边沿触发赋一次（ref 记上次条件结果）。编辑 UI=右侧「字段配置|联动规则」Tab（`LinkagePanel` 卡片列表+上下移+启停）+ 宽弹窗 `LinkageRuleEditor`（条件区按触发字段类型渲染值控件+操作符过滤，动作区按类型动态出参）。类型 `DynamicFormLinkageRule/Node/ActionType/Condition`（types/dynamic-form.ts）。
```

- [ ] **Step 4: 提交**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 动态表单加联动规则说明

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review 记录

- **Spec 覆盖**：类型(T1)/求值引擎(T2)/designer-state(T3)/编辑器(T4)/列表(T5)/Tab(T6)/预览运行时(T7)/CLAUDE.md+验证(T8) — spec 各节均有对应任务。
- **Placeholder 扫描**：无 TBD；所有代码步骤含完整代码；手测点具体到字段/操作。
- **类型一致性**：`evalCondition/evalRule/computeFieldState/EffectiveFieldState/findValueRule`（T2 定义，T7 消费）一致；`addRule/updateRule/removeRule/moveRule`（T3 定义，T5 消费）一致；`LinkageRuleEditor/emptyRule/ruleSummary/ACTION_LABEL/COND_LABEL/actionNeedsValue`（T4 定义，T5 消费）一致；`validateFieldState`（T7 validate 定义，FormPreviewDialog 消费）一致。
- **已知坑标注**：`FIELD_REGISTRY` 命名（非 FIELD_META）、`visibleOptions` 来自 CascaderControl、`useState`/`useEffect`/`useRef` import 合并、`pathKey` 分隔符不在本特性路径上（未用）。

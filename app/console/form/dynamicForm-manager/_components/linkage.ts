import type {
  DynamicFormField,
  DynamicFormLinkageNode,
  DynamicFormLinkageRule,
  DynamicFormOption,
} from "@/types";

// 联动规则求值引擎（纯函数，无 React 依赖，可独立校验）。
// 条件树任意嵌套：AND/OR 节点的 children 可含 CONDITION 或子 AND/OR（evalNode 递归）。
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

// 节点求值（递归）：CONDITION→evalCondition；AND→children 全真；OR→children 任一真。空 children=恒真。
export function evalNode(node: DynamicFormLinkageNode, values: Values): boolean {
  if (node.nodeType === "CONDITION") return evalCondition(node, values);
  const children = node.children ?? [];
  if (children.length === 0) return true;
  const results = children.map((c) => evalNode(c, values));
  return node.nodeType === "OR" ? results.some(Boolean) : results.every(Boolean);
}

// 规则求值：对 conditionTree 根节点递归求值。无根=恒真。
export function evalRule(rule: DynamicFormLinkageRule, values: Values): boolean {
  const root = rule.conditionTree?.[0];
  if (!root) return true;
  return evalNode(root, values);
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
        // actionValue = 完整选项树（DynamicFormOption[]，字段配置的副本，每项带 visible）。
        // 命中时整体替换目标字段 options；渲染仍走 visibleOptions 过滤 visible=false（含级联子级）。
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

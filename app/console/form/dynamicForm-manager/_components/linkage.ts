import type {
  DynamicFormField,
  DynamicFormLinkageNode,
  DynamicFormLinkageRule,
  DynamicFormOption,
} from "@/types";

// 联动规则求值引擎（纯函数，无 React 依赖，可独立校验）。
// 条件树任意嵌套：AND/OR 节点的 children 可含 CONDITION 或子 AND/OR（evalNode 递归）。
// 语义：条件满足才执行动作；不满足一律回字段原配置（含字段默认 visible）。SHOW/HIDE 不再反义。

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
    visible: field.visible !== false, // 字段配置的默认显隐（默认 true）
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
        if (hit) state.visible = true; // 仅命中时显示；不满足回字段原配置 visible
        break;
      case "HIDE":
        if (hit) state.visible = false; // 仅命中时隐藏；不满足回字段原配置 visible
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

// ---- 选项变更时的规则同步（宽松匹配，仅用于清理失效 value，不做精确类型判断）----

// 从值里剔除失效选项 value：字符串 -> undefined（失效时），数组 -> 过滤（空则 undefined），其他原样。
export function filterValueByOptions(v: unknown, valid: Set<string>): unknown {
  if (typeof v === "string") return valid.has(v) ? v : undefined;
  if (Array.isArray(v)) {
    const kept = v.filter((x) => typeof x !== "string" || valid.has(x));
    return kept.length ? kept : undefined;
  }
  return v;
}

// 递归过滤条件树里引用失效选项 value 的 CONDITION 节点（返回新树）。
export function pruneConditionTree(
  nodes: DynamicFormLinkageNode[],
  triggerFieldId: string,
  valid: Set<string>,
): DynamicFormLinkageNode[] {
  return nodes
    .map((n) => {
      if (n.nodeType === "CONDITION") {
        if (n.triggerFieldId !== triggerFieldId) return n;
        // 该条件引用了被改的字段：若其值引用了失效 value 则剔除整条条件。
        return referencesGone(n.triggerValue, valid) ? null : n;
      }
      return { ...n, children: n.children ? pruneConditionTree(n.children, triggerFieldId, valid) : n.children };
    })
    .filter((n): n is DynamicFormLinkageNode => n !== null);
}

// triggerValue 是否引用了任一已失效的 value。
function referencesGone(v: unknown, valid: Set<string>): boolean {
  if (typeof v === "string") return v !== "" && !valid.has(v);
  if (Array.isArray(v)) return v.some((x) => typeof x === "string" && !valid.has(x));
  return false;
}

// OPTION 树对齐：以字段最新 options 为骨架（同步 label/结构/增删），叠加旧树里的 visible 状态。
// 新增选项默认 visible=true；已删 value 被剔除；label 跟随字段最新。
export function reconcileOptionTree(
  fresh: DynamicFormOption[],
  oldTree: DynamicFormOption[] | undefined,
): DynamicFormOption[] {
  return fresh.map((f) => {
    const old = oldTree?.find((o) => o.value === f.value);
    return {
      label: f.label,
      value: f.value,
      visible: old?.visible ?? true, // 已有选项保留旧显隐；新增默认可见
      children: f.children ? reconcileOptionTree(f.children, old?.children) : undefined,
    };
  });
}

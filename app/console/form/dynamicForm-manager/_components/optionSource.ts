// 选项数据源（optionSource）纯函数：路径解析 / 占位依赖收集 / 参数替换 / 响应映射。
// 全部为纯函数，不依赖 React，方便单测与复用（设计器配置预览 + 填表运行时共用）。

import type {
  DynamicFormOption,
  DynamicFormOptionMapping,
} from "@/types/dynamic-form";

// ${fieldId} 占位符（全局匹配，注意 exec 场景需重置 lastIndex，本项目统一用 matchAll/replace 规避）。
const PLACEHOLDER_RE = /\$\{([^}]+)\}/g;

// 按点路径逐层取值。path 支持：
// - undefined / 空串 / "$" -> obj 本身；
// - "$.data" -> obj.data（JSONPath 风格，$ 为根）；
// - "data" / "a.b" -> 逐层取。
// 中途缺失返回 undefined。
export function resolvePath(obj: unknown, path?: string): unknown {
  if (path === undefined || path === "") return obj;
  if (path === "$") return obj;
  // 去掉 JSONPath 风格的前导 "$."（$.data -> data），其余按点路径逐层取。
  const p = path.startsWith("$.") ? path.slice(2) : path;
  let cur: unknown = obj;
  for (const seg of p.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

// 收集 params 字符串值里所有 ${fieldId} 占位的 fieldId（去重，保持出现顺序）。
export function collectDeps(params?: Record<string, unknown>): string[] {
  const deps = new Set<string>();
  if (!params) return [];
  for (const value of Object.values(params)) {
    if (typeof value !== "string") continue;
    for (const m of value.matchAll(PLACEHOLDER_RE)) {
      deps.add(m[1]);
    }
  }
  return [...deps];
}

// 用字段值替换 params 中的占位：
// - value 整串是单个 ${fieldId} → 直接取字段值（保留原始类型，如 number/boolean/数组）。
// - value 内含 ${fieldId} 子串 → 字符串替换（null/undefined 替换为空串）。
// - 非字符串值原样返回。
export function substituteParams(
  params: Record<string, unknown> | undefined,
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (!params) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== "string") {
      result[key] = value;
      continue;
    }
    const whole = /^\$\{([^}]+)\}$/.exec(value);
    if (whole) {
      result[key] = values[whole[1]];
      continue;
    }
    result[key] = value.replace(PLACEHOLDER_RE, (_match, fieldId: string) => {
      const v = values[fieldId];
      return v === undefined || v === null ? "" : String(v);
    });
  }
  return result;
}

// 把远程响应映射成 DynamicOption 树：
// - raw 本身是数组则直接用，否则按 mapping.listPath 再 resolvePath 取一层。
// - label/value/children 路径默认 "label"/"value"/"children"。
// - children 递归映射；label 或 value 缺失（null/undefined）的项跳过。
export function mapOptions(
  raw: unknown,
  mapping?: DynamicFormOptionMapping,
): DynamicFormOption[] {
  const labelPath = mapping?.labelPath ?? "label";
  const valuePath = mapping?.valuePath ?? "value";
  const childrenPath = mapping?.childrenPath ?? "children";

  const list = Array.isArray(raw) ? raw : resolvePath(raw, mapping?.listPath);
  if (!Array.isArray(list)) return [];

  const options: DynamicFormOption[] = [];
  for (const item of list) {
    const label = resolvePath(item, labelPath);
    const value = resolvePath(item, valuePath);
    if (label === undefined || label === null) continue;
    if (value === undefined || value === null) continue;
    const option: DynamicFormOption = {
      label: String(label),
      value: String(value),
    };
    const children = mapOptions(resolvePath(item, childrenPath), {
      labelPath,
      valuePath,
      childrenPath,
    });
    if (children.length > 0) option.children = children;
    options.push(option);
  }
  return options;
}

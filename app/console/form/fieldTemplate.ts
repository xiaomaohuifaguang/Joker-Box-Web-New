// 字段模板（dynamicFormFieldTemplate）的纯函数助手：fieldTemplate 字段 = JSON.stringify(完整 DynamicFormField)。
// 供模板管理（dynamicFormFieldTemplate）与设计器（dynamicForm-manager）两侧共用。

import { randomId } from "@/lib/utils";
import type {
  DynamicFormField,
  DynamicFormFieldGroupTemplate,
  DynamicFormFieldTemplate,
  DynamicFormLinkageNode,
  DynamicFormLinkageRule,
} from "@/types";
import { FIELD_REGISTRY } from "./dynamicForm-manager/_components/fields/registry";

// fieldTemplate JSON -> DynamicFormField；parse 失败 / type 不在 FIELD_REGISTRY -> null。
export function parseFieldTemplate(raw?: string): DynamicFormField | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      v != null &&
      typeof v === "object" &&
      typeof (v as DynamicFormField).type === "string" &&
      (v as DynamicFormField).type in FIELD_REGISTRY
    ) {
      return v as DynamicFormField;
    }
    return null;
  } catch {
    return null;
  }
}

// 模板 -> 可插入设计器画布的字段：剥实例键 id/value，重新生成 fieldId，sort 由调用方定（目标容器字段数）。
export function fieldFromTemplate(
  tpl: DynamicFormFieldTemplate,
  sort: number,
): DynamicFormField | null {
  const f = parseFieldTemplate(tpl.fieldTemplate);
  if (!f) return null;
  const { id, value, ...rest } = f;
  void id;
  void value;
  return { ...rest, fieldId: randomId(), sort };
}

// ---- 字段组合模板（dynamicFormFieldGroupTemplate）：fieldsTemplate/linkageRules 为 JSON 串 ----

// fieldsTemplate JSON -> DynamicFormField[]：逐条剥 id/value。**保留原始 fieldId**——同一模板内
// 字段与联动规则（triggerFieldId/targetFieldId/OPTION value）靠 fieldId 互相引用，必须一致；
// 错开会导致规则里的触发/目标字段、选项值全对不上。fieldId 仅在插入设计器画布时重生成（insertFieldsFromTemplate）。
export function fieldsFromTemplate(raw?: string): DynamicFormField[] | null {
  if (!raw) return null;
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const out: DynamicFormField[] = [];
  arr.forEach((v, i) => {
    if (
      v != null &&
      typeof v === "object" &&
      typeof (v as DynamicFormField).type === "string" &&
      (v as DynamicFormField).type in FIELD_REGISTRY
    ) {
      const { id, value, ...rest } = v as DynamicFormField;
      void id;
      void value;
      out.push({ ...rest, sort: i });
    }
  });
  return out.length ? out : null;
}

// ---- 插入设计器画布：重生成 fieldId + 同步改写联动规则引用 ----

// 深拷贝联动规则并改写所有 fieldId 引用（条件树 triggerFieldId / targetFieldId / OPTION value），
// 仅保留目标在新字段集内的规则。idMap 为 旧 fieldId -> 新 fieldId；rules 为空返回 []。
export function remapLinkageRules(
  rules: DynamicFormLinkageRule[],
  idMap: Map<string, string>,
): DynamicFormLinkageRule[] {
  const remapValue = (v: unknown): unknown => {
    if (typeof v === "string") return idMap.get(v) ?? v;
    if (Array.isArray(v)) return v.map(remapValue);
    if (v != null && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.value === "string") return { ...o, value: idMap.get(o.value) ?? o.value };
      return o;
    }
    return v;
  };
  const remapNode = (n: DynamicFormLinkageNode): DynamicFormLinkageNode => ({
    ...n,
    triggerFieldId: n.triggerFieldId ? (idMap.get(n.triggerFieldId) ?? n.triggerFieldId) : undefined,
    triggerValue: remapValue(n.triggerValue),
    children: n.children?.map(remapNode),
  });
  return rules
    .map((r) => ({
      ...r,
      id: undefined,
      targetFieldId: idMap.get(r.targetFieldId) ?? r.targetFieldId,
      conditionTree: (r.conditionTree ?? []).map(remapNode),
      actionValue: remapValue(r.actionValue),
    }))
    .filter((r) => {
      const t = r.targetFieldId;
      return [...idMap.values()].includes(t);
    });
}

// 组合模板 -> 插入画布的字段 + 改写引用后的规则。字段重生成 fieldId，规则按 idMap 同步改写。
export function groupFromTemplate(
  tpl: Pick<DynamicFormFieldGroupTemplate, "fieldsTemplate" | "linkageRules">,
  sortBase: number,
): { fields: DynamicFormField[]; rules: DynamicFormLinkageRule[] } | null {
  const rawFields = fieldsFromTemplate(tpl.fieldsTemplate);
  if (!rawFields) return null;
  const idMap = new Map<string, string>();
  const fields = rawFields.map((f, i) => {
    const nid = randomId();
    idMap.set(f.fieldId, nid);
    return { ...f, fieldId: nid, sort: sortBase + i };
  });
  const rawRules = rulesFromTemplate(tpl.linkageRules);
  return { fields, rules: remapLinkageRules(rawRules, idMap) };
}

// linkageRules JSON -> DynamicFormLinkageRule[]：逐条剥 id。全失败 / 非数组 -> []。
export function rulesFromTemplate(raw?: string): DynamicFormLinkageRule[] {
  if (!raw) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: DynamicFormLinkageRule[] = [];
  arr.forEach((v, i) => {
    if (
      v != null &&
      typeof v === "object" &&
      typeof (v as DynamicFormLinkageRule).name === "string" &&
      typeof (v as DynamicFormLinkageRule).targetFieldId === "string" &&
      typeof (v as DynamicFormLinkageRule).actionType === "string"
    ) {
      const { id, ...rest } = v as DynamicFormLinkageRule;
      void id;
      out.push({ ...rest, sortOrder: i });
    }
  });
  return out;
}

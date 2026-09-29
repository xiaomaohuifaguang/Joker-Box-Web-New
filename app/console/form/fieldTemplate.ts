// 字段模板（dynamicFormFieldTemplate）的纯函数助手：fieldTemplate 字段 = JSON.stringify(完整 DynamicFormField)。
// 供模板管理（dynamicFormFieldTemplate）与设计器（dynamicForm-manager）两侧共用。

import { randomId } from "@/lib/utils";
import type { DynamicFormField, DynamicFormFieldTemplate } from "@/types";
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

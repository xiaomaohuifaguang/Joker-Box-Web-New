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

// permission 映射进克隆字段（优先级高于表单设计配置与联动规则）：
// HIDDEN -> visible:false + props.__processHidden:true；READONLY -> props.__processReadonly:true；REQUIRED -> required:"1"。
function applyPermission(f: DynamicFormField): DynamicFormField {
  const p = (f as { permission?: string | null }).permission;
  if (p === "HIDDEN")
    return { ...f, visible: false, props: { ...f.props, __processHidden: true } };
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

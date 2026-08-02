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
// VISIBLE / 空 / 未知值 -> 原样返回，不做任何限制，跟随表单自身设计配置与联动规则。
// readOnly（查看态）下：忽略表单自身 visible=false（visible 是填写态的联动起点状态，查看不填写故不设限），
// 但 permission=HIDDEN 是权限边界，仍强制隐藏。
function applyPermission(f: DynamicFormField, readOnly?: boolean): DynamicFormField {
  const raw = (f as { permission?: string | null }).permission;
  const p = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (p === "HIDDEN")
    return { ...f, visible: false, props: { ...f.props, __processHidden: true } };
  if (p === "READONLY")
    return { ...f, ...(readOnly ? { visible: true } : {}), props: { ...f.props, __processReadonly: true } };
  if (p === "REQUIRED")
    return { ...f, ...(readOnly ? { visible: true } : {}), required: "1" };
  // VISIBLE / 空 / 未知：不限制。查看态额外把自身 visible=false 放开。
  return readOnly ? { ...f, visible: true } : f;
}

// 流程表单渲染：把 permission 映射进字段后用共享 DynamicFormRenderer。键=fieldId。
// readOnly=整表只读（查看详情；显示字段也不可改）。linkage=是否引入联动规则（默认 readOnly 时不引入）。
export function ProcessFormFields({
  form,
  readOnly,
  linkage,
  values,
  errors,
  onChange,
  rendererRef,
}: {
  form: TaskFormVO;
  readOnly?: boolean;
  linkage?: boolean;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldId: string, v: unknown) => void;
  rendererRef?: Ref<DynamicFormRendererHandle>;
}) {
  const g = form.globalForm;
  if (!g) return null;
  const fields: DynamicFormField[] = (g.fields ?? []).map((f) =>
    applyPermission(f, readOnly),
  );
  const groups: DynamicFormFieldGroup[] = (g.groups ?? []).map((gr) => ({
    ...gr,
    fields: gr.fields.map((f) => applyPermission(f, readOnly)),
  }));
  // 是否引入联动：显式传 linkage 优先；否则 readOnly 默认不引入、可编辑默认引入。
  const useLinkage = linkage ?? !readOnly;
  return (
    <DynamicFormRenderer
      ref={rendererRef}
      fields={fields}
      groups={groups}
      linkageRules={useLinkage ? (g.linkageRules ?? []) : []}
      values={values}
      errors={readOnly ? {} : errors}
      onChange={readOnly ? () => {} : onChange}
      disabled={readOnly}
    />
  );
}

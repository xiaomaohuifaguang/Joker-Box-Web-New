// 网关自定义条件的「字段来源分类」抽象（ProcessGatewayConditionNode.category）。
// 当前仅 FORM_FIELD（流程绑定的全局表单字段）；后续加「申请人/部门/流程变量」等只需
// 在 CONDITION_SOURCES 注册新条目（候选字段 + 取字段定义的方式），编辑器与求值随之扩展。
import { getDynamicFormInfo } from "@/lib/api/dynamicForm";
import type { DynamicFormField, ProcessGatewayConditionCategory } from "@/types";

// 一个条件候选字段：key=字段标识(fieldId)、label=展示名、field=字段定义（决定可用运算符/值控件类型）。
export interface ConditionFieldOption {
  key: string;
  label: string;
  field?: DynamicFormField;
}

// 候选字段的一个分组（key 稳定、title 展示、options 该组字段）。未分组标题=「未分组」。
export interface ConditionFieldGroup {
  key: string;
  title: string;
  options: ConditionFieldOption[];
}

// FORM_FIELD：拉主表单设计配置，未分组字段 + 各分组（保持表单设计的组排版）。
async function loadFormFields(formId: string, formVersion: string): Promise<ConditionFieldGroup[]> {
  const form = await getDynamicFormInfo(formId, formVersion);
  const toOpt = (f: DynamicFormField): ConditionFieldOption => ({
    key: f.fieldId,
    label: f.title || f.fieldId,
    field: f,
  });
  const groups: ConditionFieldGroup[] = [];
  if ((form.fields?.length ?? 0) > 0) {
    groups.push({ key: "__ungrouped__", title: "未分组", options: (form.fields ?? []).map(toOpt) });
  }
  for (const g of form.groups ?? []) {
    groups.push({
      key: g.id ?? g.clientId ?? g.name,
      title: g.name || "分组",
      options: (g.fields ?? []).map(toOpt),
    });
  }
  return groups;
}

// 分类注册表：category → 候选字段（按组）加载器。参数=加载上下文（FORM_FIELD 需主表单 formId+formVersion）。
export const CONDITION_SOURCES: Record<
  ProcessGatewayConditionCategory,
  (ctx: { formId: string; formVersion: string }) => Promise<ConditionFieldGroup[]>
> = {
  FORM_FIELD: (ctx) => loadFormFields(ctx.formId, ctx.formVersion),
};

// 拍平分组为字段列表（按 fieldKey 查字段定义用）。
export function flattenFieldGroups(groups: ConditionFieldGroup[]): ConditionFieldOption[] {
  return groups.flatMap((g) => g.options);
}

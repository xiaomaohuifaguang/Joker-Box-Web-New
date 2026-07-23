import type { DynamicFormField } from "@/types";
import type { EffectiveFieldState } from "./linkage";
import { FIELD_REGISTRY } from "./fields/registry";

// 预览用前端校验：必填 / 长度 / 数值范围 / 正则。返回错误信息（null=通过）。
export function validateField(field: DynamicFormField, value: unknown): string | null {
  const meta = FIELD_REGISTRY[field.type];
  const isEmpty =
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  // 必填。
  if (field.required === "1" && isEmpty) {
    return `请填写${field.title}`;
  }
  if (isEmpty) return null; // 非必填且空 -> 跳过后续校验

  // 长度（文本类）。
  if (meta.hasLength && typeof value === "string") {
    if (field.minLength != null && value.length < field.minLength) {
      return `${field.title}至少 ${field.minLength} 个字符`;
    }
    if (field.maxLength != null && value.length > field.maxLength) {
      return `${field.title}最多 ${field.maxLength} 个字符`;
    }
  }

  // 数值范围（NUMBER/SLIDER/RATE）。
  if (meta.hasMinMax) {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      if (field.min != null && n < field.min) return `${field.title}不能小于 ${field.min}`;
      if (field.max != null && n > field.max) return `${field.title}不能大于 ${field.max}`;
    }
  }

  // 正则（文本类）。
  if (meta.hasPattern && field.pattern && typeof value === "string") {
    try {
      if (!new RegExp(field.pattern).test(value)) {
        return field.patternTips || `${field.title}格式不正确`;
      }
    } catch {
      // 非法正则表达式 -> 跳过（设计器侧问题，不算用户输入错）。
    }
  }

  return null;
}

// 按联动后的有效状态校验：required/pattern 取有效状态（覆盖字段原配置）。
export function validateFieldState(
  field: DynamicFormField,
  state: EffectiveFieldState,
  value: unknown,
): string | null {
  return validateField({ ...field, required: state.required, pattern: state.pattern }, value);
}

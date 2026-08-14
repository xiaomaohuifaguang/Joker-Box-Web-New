"use client";

import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ConditionFieldGroup } from "./conditionSources";

// 条件字段选择器：按「未分组/各分组」分组展示的单个字段下拉（选值=fieldId）。
// 数据本身带组（表单 fields+groups），此处只把平铺 SelectItem 换成 SelectGroup 分节。
export function ConditionFieldSelect({
  groups,
  value,
  placeholder = "选择字段",
  triggerClassName = "h-8 w-44",
  disabled,
  onChange,
}: {
  /** 带组的候选字段（未分组+各分组） */
  groups: ConditionFieldGroup[];
  value: string | undefined;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
  onChange: (fieldKey: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g.key}>
            <SelectLabel>{g.title}</SelectLabel>
            {g.options.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Star, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { UploadControl } from "./UploadControl";
import { CascaderControl, MultiCascaderControl, visibleOptions } from "./CascaderControl";
import { MultiSelectControl } from "./MultiSelectControl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DynamicFormField, DynamicFormFieldType, DynamicFormOption } from "@/types";

// 字段控件：渲染一个可交互的真实表单控件（预览 + 默认值编辑复用）。
// value/onChange 受控；disabled 用于只读展示。
export type FieldControlProps = {
  field: DynamicFormField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
};

// ---- 清空按钮（统一方案）----
// 原则：末尾位互斥——有值显 ×（点击清空），无值显 chevron，两者占同一位置（触发器右端）。
// × 常驻（预览在 Dialog 内，hover 不可靠）。
// Clearable 包外层：× 绝对定位 right-2（触发器最右端）。Radix Select 需同时隐藏其自带 chevron
// 并自绘「无值时的 chevron」（见 SelectControl）。原生 input（text/number/time）自带清除，不用此组件。
function Clearable({
  show,
  onClear,
  children,
}: {
  show: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full">
      {children}
      {show && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label="清空"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---- 通用小控件 ----

function toStr(v: unknown): string {
  return v == null ? "" : String(v);
}
function toNum(v: unknown): number | undefined {
  const n = Number(v);
  return v == null || v === "" || Number.isNaN(n) ? undefined : n;
}
function toArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function TextControl({ value, onChange, disabled, field }: FieldControlProps) {
  return (
    <Input
      value={toStr(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      type={field.type === "NUMBER" ? "number" : "text"}
      maxLength={field.maxLength}
    />
  );
}

function TextareaControl({ value, onChange, disabled, field }: FieldControlProps) {
  return (
    <Textarea
      value={toStr(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={3}
      maxLength={field.maxLength}
    />
  );
}

function SwitchControl({ value, onChange, disabled }: FieldControlProps) {
  return (
    <Switch
      checked={value === "1"}
      onCheckedChange={(c) => onChange(c ? "1" : "0")}
      disabled={disabled}
    />
  );
}

function SliderControl({ value, onChange, disabled, field }: FieldControlProps) {
  const v = toNum(value) ?? field.min ?? 0;
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={[v]}
        min={field.min ?? 0}
        max={field.max ?? 100}
        step={1}
        onValueChange={([x]) => onChange(x)}
        disabled={disabled}
        className="flex-1"
      />
      <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{v}</span>
    </div>
  );
}

function RateControl({ value, onChange, disabled, field }: FieldControlProps) {
  const v = toNum(value) ?? 0;
  const max = field.max ?? 5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="text-muted-foreground transition-colors hover:text-brand disabled:pointer-events-none"
          aria-label={`${n} 星`}
        >
          <Star className={cn("h-5 w-5", n <= v && "fill-brand text-brand")} />
        </button>
      ))}
    </div>
  );
}

function ColorControl({ value, onChange, disabled }: FieldControlProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={toStr(value) || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
      />
      <span className="font-mono text-sm text-muted-foreground">{toStr(value) || "#000000"}</span>
    </div>
  );
}

// 渲染用选项：默认过滤 visible=false；field.props.showAllOptions（联动 VALUE 赋值）时列全部。
function renderOptions(field: DynamicFormField): DynamicFormOption[] {
  return field.props?.showAllOptions ? (field.options ?? []) : visibleOptions(field.options ?? []);
}

function SelectControl({ value, onChange, disabled, field }: FieldControlProps) {
  const str = toStr(value);
  const clearable = !disabled && str !== "";
  return (
    <Clearable show={clearable} onClear={() => onChange(undefined)}>
      <Select value={str} onValueChange={onChange} disabled={disabled}>
        {/* 隐藏 Radix 自带 chevron；末尾位互斥——有值由 Clearable 显 ×，无值自绘 chevron。 */}
        <SelectTrigger className="w-full [&>svg]:hidden">
          <SelectValue placeholder={field.placeholder ?? "请选择"} />
          {!clearable && <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />}
        </SelectTrigger>
        {/* position=popper：锚定触发器正下方。默认 item-aligned 在仅禁用占位项（空选项）时对齐计算会跑飞到页面左上角。 */}
        <SelectContent position="popper">
          {renderOptions(field).length === 0 ? (
            // 禁用 SelectItem 当占位（裸 <p> 会被 Radix 当 item 定位跑偏）。
            <SelectItem value="__empty__" disabled>
              暂无可用选项
            </SelectItem>
          ) : (
            renderOptions(field).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </Clearable>
  );
}

function RadioControl({ value, onChange, disabled, field }: FieldControlProps) {
  const opts = renderOptions(field);
  if (opts.length === 0) {
    return <p className="text-xs text-muted-foreground">暂无可用选项</p>;
  }
  return (
    <RadioGroup
      value={toStr(value)}
      onValueChange={onChange}
      disabled={disabled}
      className="flex flex-row flex-wrap gap-x-4 gap-y-2"
    >
      {opts.map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <RadioGroupItem value={o.value} id={`${field.fieldId}-${o.value}`} />
          <Label htmlFor={`${field.fieldId}-${o.value}`} className="font-normal">
            {o.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

// 多选框（CHECKBOX）：value 是 string[]。平铺 checkbox 组，横向排列方便 span 布局。
function CheckboxControl({ value, onChange, disabled, field }: FieldControlProps) {
  const arr = toArr(value);
  const toggle = (v: string, on: boolean) =>
    onChange(on ? [...arr, v] : arr.filter((x) => x !== v));
  const opts = renderOptions(field);
  if (opts.length === 0) {
    return <p className="text-xs text-muted-foreground">暂无可用选项</p>;
  }
  return (
    <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
      {opts.map((o) => (
        <div key={o.value} className="flex items-center gap-2">
          <Checkbox
            id={`${field.fieldId}-${o.value}`}
            checked={arr.includes(o.value)}
            onCheckedChange={(c) => toggle(o.value, c === true)}
            disabled={disabled}
          />
          <Label htmlFor={`${field.fieldId}-${o.value}`} className="font-normal">
            {o.label}
          </Label>
        </div>
      ))}
    </div>
  );
}

// 日期 / 日期时间：DatePicker。value 为字符串 YYYY-MM-DD（或带时间）。
function DateControl({ value, onChange, disabled, field }: FieldControlProps) {
  const withTime = field.type === "DATETIME";
  const str = toStr(value);
  const date = str ? new Date(str.replace(" ", "T")) : undefined;
  const [open, setOpen] = useState(false);
  return (
    <Clearable show={!disabled && str !== ""} onClear={() => onChange(undefined)}>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start font-normal", !str && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {str || field.placeholder || "选择日期"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            const base = format(d, "yyyy-MM-dd");
            onChange(withTime ? `${base} ${format(d, "HH:mm")}` : base);
            if (!withTime) setOpen(false);
          }}
        />
        {withTime && (
          <div className="border-t p-2">
            <Input
              type="time"
              value={str.includes(" ") ? str.split(" ")[1] : ""}
              onChange={(e) => {
                const base = str ? str.split(" ")[0] : format(new Date(), "yyyy-MM-dd");
                onChange(`${base} ${e.target.value}`);
              }}
              className="bg-background text-foreground dark:[color-scheme:dark]"
            />
          </div>
        )}
      </PopoverContent>
      </Popover>
    </Clearable>
  );
}

function TimeControl({ value, onChange, disabled }: FieldControlProps) {
  return (
    <Input
      type="time"
      value={toStr(value)}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      // 原生 time 选择器是浏览器控件，不吃 data-theme；补背景/文字色 + color-scheme 跟随明暗。
      className="bg-background text-foreground dark:[color-scheme:dark]"
    />
  );
}

// ---- 注册表 ----

export type FieldMeta = {
  type: DynamicFormFieldType;
  label: string;
  group: "基础" | "选择" | "日期时间" | "高级";
  // 新建字段时的默认属性。
  defaults: () => Partial<DynamicFormField>;
  Control: (p: FieldControlProps) => ReactNode;
  // 是否有 options / 长度校验 / 数值校验 / 正则（决定配置面板显示哪些项）。
  hasOptions?: boolean;
  hasLength?: boolean;
  hasMinMax?: boolean;
  hasPattern?: boolean;
  hasPlaceholder?: boolean;
};

export const FIELD_REGISTRY: Record<DynamicFormFieldType, FieldMeta> = {
  INPUT: {
    type: "INPUT",
    label: "单行文本",
    group: "基础",
    defaults: () => ({ placeholder: "请输入" }),
    Control: TextControl,
    hasLength: true,
    hasPattern: true,
    hasPlaceholder: true,
  },
  TEXTAREA: {
    type: "TEXTAREA",
    label: "多行文本",
    group: "基础",
    defaults: () => ({ placeholder: "请输入" }),
    Control: TextareaControl,
    hasLength: true,
    hasPattern: true,
    hasPlaceholder: true,
  },
  NUMBER: {
    type: "NUMBER",
    label: "数字",
    group: "基础",
    defaults: () => ({ placeholder: "请输入数字" }),
    Control: TextControl,
    hasMinMax: true,
    hasPlaceholder: true,
  },
  SWITCH: {
    type: "SWITCH",
    label: "开关",
    group: "基础",
    defaults: () => ({ defaultValue: "0" }),
    Control: SwitchControl,
  },
  SLIDER: {
    type: "SLIDER",
    label: "滑块",
    group: "高级",
    defaults: () => ({ min: 0, max: 100, defaultValue: 0 }),
    Control: SliderControl,
    hasMinMax: true,
  },
  RATE: {
    type: "RATE",
    label: "评分",
    group: "高级",
    defaults: () => ({ max: 5, defaultValue: 0 }),
    Control: RateControl,
    hasMinMax: true,
  },
  COLOR: {
    type: "COLOR",
    label: "颜色",
    group: "高级",
    defaults: () => ({ defaultValue: "#000000" }),
    Control: ColorControl,
  },
  SELECT: {
    type: "SELECT",
    label: "下拉单选",
    group: "选择",
    defaults: () => ({ placeholder: "请选择", options: [] }),
    Control: SelectControl,
    hasOptions: true,
    hasPlaceholder: true,
  },
  MULTISELECT: {
    type: "MULTISELECT",
    label: "下拉多选",
    group: "选择",
    defaults: () => ({ placeholder: "请选择", options: [], defaultValue: [] }),
    Control: MultiSelectControl, // 真正的下拉多选（收进下拉面板），区别于 CHECKBOX 的平铺 checkbox 组
    hasOptions: true,
    hasPlaceholder: true,
  },
  RADIO: {
    type: "RADIO",
    label: "单选框",
    group: "选择",
    defaults: () => ({ options: [] }),
    Control: RadioControl,
    hasOptions: true,
  },
  CHECKBOX: {
    type: "CHECKBOX",
    label: "多选框",
    group: "选择",
    defaults: () => ({ options: [], defaultValue: [] }),
    Control: CheckboxControl,
    hasOptions: true,
  },
  DATE: {
    type: "DATE",
    label: "日期",
    group: "日期时间",
    defaults: () => ({ placeholder: "选择日期" }),
    Control: DateControl,
    hasPlaceholder: true,
  },
  TIME: {
    type: "TIME",
    label: "时间",
    group: "日期时间",
    defaults: () => ({ placeholder: "选择时间" }),
    Control: TimeControl,
    hasPlaceholder: true,
  },
  DATETIME: {
    type: "DATETIME",
    label: "日期时间",
    group: "日期时间",
    defaults: () => ({ placeholder: "选择日期时间" }),
    Control: DateControl,
    hasPlaceholder: true,
  },
  UPLOAD: {
    type: "UPLOAD",
    label: "上传",
    group: "高级",
    defaults: () => ({ max: 1 }), // max = 最大上传数量
    Control: UploadControl,
  },
  CASCADER: {
    type: "CASCADER",
    label: "级联选择",
    group: "选择",
    defaults: () => ({ placeholder: "请选择", options: [] }),
    Control: CascaderControl,
    hasOptions: true,
    hasPlaceholder: true,
  },
  MULTICASCADER: {
    type: "MULTICASCADER",
    label: "级联多选",
    group: "选择",
    defaults: () => ({ placeholder: "请选择", options: [], defaultValue: [] }),
    Control: MultiCascaderControl,
    hasOptions: true,
    hasPlaceholder: true,
  },
};

export const FIELD_GROUPS: FieldMeta["group"][] = ["基础", "选择", "日期时间", "高级"];

// 新建字段：给 fieldId + 类型默认属性。
export function createField(type: DynamicFormFieldType, sort: number): DynamicFormField {
  const meta = FIELD_REGISTRY[type];
  return {
    fieldId: crypto.randomUUID(),
    title: meta.label,
    type,
    required: "0",
    span: 24,
    sort,
    ...meta.defaults(),
  };
}

export type { DynamicFormOption };

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { DynamicFormField } from "@/types";
import { FIELD_REGISTRY } from "./fields/registry";
import { OptionsEditor } from "./OptionsEditor";

// 右侧配置面板：按选中字段的 type 动态显示通用属性 + 校验属性 + 选项编辑。
export function FieldConfigPanel({
  field,
  onChange,
}: {
  field: DynamicFormField | null;
  onChange: (patch: Partial<DynamicFormField>) => void;
}) {
  if (!field) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        选中画布中的字段进行配置
      </div>
    );
  }
  const meta = FIELD_REGISTRY[field.type];
  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="text-sm font-medium">
        {meta.label}
        <span className="ml-2 text-xs font-normal text-muted-foreground">{field.type}</span>
      </div>
      <Separator />

      <Field label="标题">
        <Input value={field.title} onChange={(e) => onChange({ title: e.target.value })} className="h-8" />
      </Field>

      <Field label="必填">
        <div className="flex items-center gap-2">
          <Switch
            checked={field.required === "1"}
            onCheckedChange={(c) => onChange({ required: c ? "1" : "0" })}
          />
          <span className="text-xs text-muted-foreground">{field.required === "1" ? "必填" : "选填"}</span>
        </div>
      </Field>

      {meta.hasPlaceholder && (
        <Field label="占位提示">
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            className="h-8"
          />
        </Field>
      )}

      <Field label={`宽度（${field.span ?? 24}/24）`}>
        <Slider
          value={[field.span ?? 24]}
          min={1}
          max={24}
          step={1}
          onValueChange={([v]) => onChange({ span: v })}
        />
      </Field>

      {/* 默认值：复用该字段类型的真实控件编辑（选项类需先配选项才能选默认值）。 */}
      <Field label="默认值">
        <DefaultValueEditor field={field} onChange={(defaultValue) => onChange({ defaultValue })} />
      </Field>

      {meta.hasOptions && (
        <Field label="选项">
          <OptionsEditor
            options={field.options ?? []}
            onChange={(options) => onChange({ options })}
          />
        </Field>
      )}

      {(meta.hasLength || meta.hasMinMax || meta.hasPattern) && <Separator />}
      {(meta.hasLength || meta.hasMinMax || meta.hasPattern) && (
        <div className="text-xs font-medium text-muted-foreground">校验</div>
      )}

      {meta.hasLength && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="最小长度">
            <Input
              type="number"
              value={field.minLength ?? ""}
              onChange={(e) => onChange({ minLength: num(e.target.value) })}
              className="h-8"
            />
          </Field>
          <Field label="最大长度">
            <Input
              type="number"
              value={field.maxLength ?? ""}
              onChange={(e) => onChange({ maxLength: num(e.target.value) })}
              className="h-8"
            />
          </Field>
        </div>
      )}

      {meta.hasMinMax && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="最小值">
            <Input
              type="number"
              value={field.min ?? ""}
              onChange={(e) => onChange({ min: num(e.target.value) })}
              className="h-8"
            />
          </Field>
          <Field label="最大值">
            <Input
              type="number"
              value={field.max ?? ""}
              onChange={(e) => onChange({ max: num(e.target.value) })}
              className="h-8"
            />
          </Field>
        </div>
      )}

      {meta.hasPattern && (
        <>
          <Field label="正则校验">
            <Input
              value={field.pattern ?? ""}
              onChange={(e) => onChange({ pattern: e.target.value })}
              placeholder="^\\d+$"
              className="h-8 font-mono"
            />
          </Field>
          <Field label="校验失败提示">
            <Input
              value={field.patternTips ?? ""}
              onChange={(e) => onChange({ patternTips: e.target.value })}
              className="h-8"
            />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// 默认值编辑器：复用该字段类型的真实控件（registry.Control）编辑 defaultValue。
// 选项类（SELECT/RADIO/CHECKBOX/MULTISELECT）需先配 options，否则提示先加选项。
function DefaultValueEditor({
  field,
  onChange,
}: {
  field: DynamicFormField;
  onChange: (defaultValue: unknown) => void;
}) {
  const meta = FIELD_REGISTRY[field.type];
  if (meta.hasOptions && (field.options ?? []).length === 0) {
    return (
      <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
        先在下方「选项」里添加选项，再设默认值
      </p>
    );
  }
  const Control = meta.Control;
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <Control field={field} value={field.defaultValue} onChange={onChange} />
    </div>
  );
}

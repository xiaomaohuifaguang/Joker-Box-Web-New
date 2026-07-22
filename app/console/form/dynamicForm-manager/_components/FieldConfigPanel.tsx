"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { DynamicFormField, DynamicFormOption } from "@/types";
import { cn } from "@/lib/utils";
import { FIELD_REGISTRY } from "./fields/registry";
import {
  CascaderInline,
  MultiCascaderInline,
  cascaderPathLabels,
} from "./fields/CascaderControl";
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
  const isCascader = field.type === "CASCADER" || field.type === "MULTICASCADER";
  const isUpload = field.type === "UPLOAD";
  // checkStrictly 存 props.checkStrictly（true=可任选层级，默认 false=仅叶子）。
  const checkStrictly = field.props?.checkStrictly === true;

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
        <Field label={isCascader ? "选项（可嵌套子级）" : "选项"}>
          {/* 选项统一弹窗编辑：窄面板内联编辑拥挤，单开宽 Dialog 配置（级联带嵌套子级）。 */}
          <OptionsDialog
            cascade={isCascader}
            options={field.options ?? []}
            onChange={(options) => onChange({ options })}
          />
        </Field>
      )}

      {/* 级联专属：checkStrictly（任选层级 vs 仅叶子）。 */}
      {isCascader && (
        <Field label="任选层级（checkStrictly）">
          <div className="flex items-center gap-2">
            <Switch
              checked={checkStrictly}
              onCheckedChange={(c) =>
                onChange({ props: { ...field.props, checkStrictly: c } })
              }
            />
            <span className="text-xs text-muted-foreground">
              {checkStrictly ? "可选任意层级" : "仅可选叶子节点"}
            </span>
          </div>
        </Field>
      )}

      {/* 上传专属：最大数量（用 max 字段）。 */}
      {isUpload && (
        <Field label="最大上传数量">
          <Input
            type="number"
            min={1}
            value={field.max ?? 1}
            onChange={(e) => onChange({ max: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
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
  // 上传默认值无意义（设计器里传文件做默认不合理）。
  if (field.type === "UPLOAD") {
    return (
      <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
        上传字段不支持默认值
      </p>
    );
  }
  if (meta.hasOptions && (field.options ?? []).length === 0) {
    return (
      <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
        先在下方「选项」里添加选项，再设默认值
      </p>
    );
  }
  // 级联默认值：下拉在窄面板会被裁剪、层级多显示不全 -> 改「按钮 + 宽 Dialog 内联级联面板」。
  if (field.type === "CASCADER" || field.type === "MULTICASCADER") {
    return <CascaderDefaultEditor field={field} onChange={onChange} />;
  }
  const Control = meta.Control;
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <Control field={field} value={field.defaultValue} onChange={onChange} />
    </div>
  );
}

// 级联默认值编辑器：窄面板放不下多层级联下拉，用宽 Dialog 平铺面板编辑（横向可滚动）。
function CascaderDefaultEditor({
  field,
  onChange,
}: {
  field: DynamicFormField;
  onChange: (defaultValue: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = field.options ?? [];
  const multi = field.type === "MULTICASCADER";
  const paths: string[][] = multi
    ? Array.isArray(field.defaultValue)
      ? (field.defaultValue as string[][])
      : []
    : Array.isArray(field.defaultValue) && field.defaultValue.length
      ? [field.defaultValue as string[]]
      : [];
  const summary = paths.length
    ? paths.map((p) => cascaderPathLabels(options, p)).join("、")
    : "";

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setOpen(true)}>
        <span className={cn("truncate", !summary && "text-muted-foreground")}>
          {summary || "选择默认值"}
        </span>
        <Pencil className="h-3.5 w-3.5 shrink-0" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>默认值（{field.title || "级联"}）</DialogTitle>
          </DialogHeader>
          {multi ? (
            <MultiCascaderInline field={field} value={field.defaultValue} onChange={onChange} />
          ) : (
            <CascaderInline field={field} value={field.defaultValue} onChange={onChange} />
          )}
          <DialogFooter>
            {paths.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(multi ? [] : undefined)}
              >
                清除
              </Button>
            )}
            <Button size="sm" onClick={() => setOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 选项编辑弹窗：窄面板内联编辑拥挤，单开宽 Dialog 全宽配置。cascade=true 时支持嵌套子级（级联）。
function OptionsDialog({
  cascade,
  options,
  onChange,
}: {
  cascade?: boolean;
  options: DynamicFormOption[];
  onChange: (options: DynamicFormOption[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // 统计叶子节点数（粗略反映选项规模）。
  function countLeaf(list: DynamicFormOption[]): number {
    return list.reduce(
      (acc, o) => acc + (o.children?.length ? countLeaf(o.children) : 1),
      0,
    );
  }
  const summary = cascade
    ? options.length
      ? `${options.length} 个根选项 / ${countLeaf(options)} 个叶子`
      : "配置级联选项"
    : options.length
      ? `${options.length} 个选项`
      : "配置选项";
  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setOpen(true)}>
        <span className="text-muted-foreground">{summary}</span>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{cascade ? "级联选项" : "选项"}</DialogTitle>
          </DialogHeader>
          <OptionsEditor options={options} onChange={onChange} cascade={cascade} />
        </DialogContent>
      </Dialog>
    </>
  );
}

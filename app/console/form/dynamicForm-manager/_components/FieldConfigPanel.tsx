"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  DynamicFormField,
  DynamicFormOption,
  DynamicFormOptionMapping,
  DynamicFormOptionSource,
  DynamicFormTableColumn,
} from "@/types";
import { cn } from "@/lib/utils";
import { FIELD_REGISTRY } from "./fields/registry";
import {
  CascaderInline,
  MultiCascaderInline,
  cascaderPathLabels,
} from "./fields/CascaderControl";
import { OptionsEditor } from "./OptionsEditor";

// 右侧配置面板：按选中字段的 type 动态显示通用属性 + 校验属性 + 选项编辑。
// allFields = 全部字段（未分组 + 分组内），供远程选项 params 的「插入字段引用」下拉用。
export function FieldConfigPanel({
  field,
  allFields = [],
  onChange,
}: {
  field: DynamicFormField | null;
  allFields?: DynamicFormField[];
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
  const isTable = field.type === "TABLE";
  const isDateRange = field.type === "DATERANGE";
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

      {/* 默认显隐：false=默认隐藏，配合联动 SHOW 满足条件时才显示（SHOW/HIDE 不满足回此配置）。 */}
      <Field label="默认显示">
        <div className="flex items-center gap-2">
          <Switch
            checked={field.visible !== false}
            onCheckedChange={(c) => onChange({ visible: c })}
          />
          <span className="text-xs text-muted-foreground">{field.visible !== false ? "显示" : "隐藏（可被联动显示）"}</span>
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
            field={field}
            allFields={allFields}
            onChange={onChange}
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

      {/* 动态表格专属：列定义（key/title 列表，弹窗编辑）。 */}
      {isTable && (
        <Field label="表格列">
          <TableColumnsDialog
            columns={field.tableColumns ?? []}
            onChange={(tableColumns) => onChange({ tableColumns })}
          />
        </Field>
      )}

      {/* 日期范围专属：withTime（值带时分 vs 仅日期）。 */}
      {isDateRange && (
        <Field label="包含时间">
          <div className="flex items-center gap-2">
            <Switch
              checked={field.props?.withTime === true}
              onCheckedChange={(c) =>
                onChange({ props: { ...field.props, withTime: c } })
              }
            />
            <span className="text-xs text-muted-foreground">
              {field.props?.withTime === true ? "精确到时分" : "仅日期"}
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
  // 动态表格默认值无意义（设计器里预填表格行不合理）。
  if (field.type === "TABLE") {
    return (
      <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
        动态表格不支持默认值
      </p>
    );
  }
  // API 远程数据源（跟随数据源类型）：设计态拉不到远程选项 -> 恒显只读提示，不给设默认值。
  if (meta.hasOptions && field.optionSource?.type === "API") {
    return (
      <p className="rounded-md border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
        远程选项运行时拉取，默认值在预览/填表时按远程选项选值
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

// 码表选项预设的固定 url（摘要文案与预设识别都靠它判断）。
const CODE_TABLE_OPTIONS_URL = "/code-table/options";

// 选项编辑弹窗：窄面板内联编辑拥挤，单开宽 Dialog 全宽配置。
// 顶部「数据来源」切换：STATIC=手动选项（OptionsEditor，cascade 支持嵌套子级）；API=远程拉取配置。
// 手动 options 两种来源下都保留：API 时仅作兜底（远程拉取失败/未配置时用）。
function OptionsDialog({
  cascade,
  field,
  allFields,
  onChange,
}: {
  cascade?: boolean;
  field: DynamicFormField;
  allFields: DynamicFormField[];
  onChange: (patch: Partial<DynamicFormField>) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = field.options ?? [];
  const source = field.optionSource;
  const isApi = source?.type === "API";

  // 统计叶子节点数（粗略反映选项规模）。
  function countLeaf(list: DynamicFormOption[]): number {
    return list.reduce(
      (acc, o) => acc + (o.children?.length ? countLeaf(o.children) : 1),
      0,
    );
  }

  // 摘要按钮文案：API 显示远程来源，STATIC 显示选项个数。
  let summary: string;
  if (isApi) {
    const code = source?.params?.code;
    summary =
      source?.url === CODE_TABLE_OPTIONS_URL
        ? `码表：${typeof code === "string" && code ? code : "未配置"}`
        : `远程：${source?.url || "未配置"}`;
  } else {
    summary = cascade
      ? options.length
        ? `${options.length} 个根选项 / ${countLeaf(options)} 个叶子`
        : "配置级联选项"
      : options.length
        ? `${options.length} 个选项`
        : "配置选项";
  }

  // 切换数据来源：STATIC 清空 optionSource（手动 options 保留）；API 给一份空配置。
  function switchSource(v: string) {
    if (!v) return; // 单选 ToggleGroup 点已选项会回空串，忽略
    if (v === "API") {
      onChange({
        optionSource: { type: "API", url: "", method: "POST", params: {}, mapping: {} },
      });
    } else {
      onChange({ optionSource: undefined });
    }
  }

  // 局部更新 optionSource（保持 type:"API"，未配置的键给默认）。
  function setSource(patch: Partial<Omit<DynamicFormOptionSource, "type">>) {
    onChange({
      optionSource: {
        type: "API",
        url: source?.url ?? "",
        method: source?.method ?? "POST",
        params: source?.params ?? {},
        mapping: source?.mapping ?? {},
        ...patch,
      },
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => setOpen(true)}>
        <span className="truncate text-muted-foreground">{summary}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{cascade ? "级联选项" : "选项"}</DialogTitle>
          </DialogHeader>

          {/* 数据来源切换：STATIC 手动 / API 远程 */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">数据来源</Label>
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={isApi ? "API" : "STATIC"}
              onValueChange={switchSource}
            >
              <ToggleGroupItem value="STATIC">手动选项</ToggleGroupItem>
              <ToggleGroupItem value="API">远程</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {isApi ? (
            <ApiSourceForm
              source={source ?? { type: "API" }}
              onChange={setSource}
              // 字段引用下拉排除自身（引用自己无意义）
              otherFields={allFields.filter((f) => f.fieldId !== field.fieldId)}
            />
          ) : (
            <OptionsEditor
              options={options}
              onChange={(opts) => onChange({ options: opts })}
              cascade={cascade}
            />
          )}

          {isApi && (
            <p className="text-xs text-muted-foreground">
              远程选项运行时拉取，以此为准；接口异常显「数据源异常」，空列表显「暂无可用选项」
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// API 远程选项配置表单：预设 / url / method / params（支持 ${fieldId} 字段引用）/ mapping。
function ApiSourceForm({
  source,
  otherFields,
  onChange,
}: {
  source: DynamicFormOptionSource;
  otherFields: DynamicFormField[];
  onChange: (patch: Partial<Omit<DynamicFormOptionSource, "type">>) => void;
}) {
  const url = source.url ?? "";
  const method = source.method ?? "POST";
  const mapping = source.mapping ?? {};
  // 预设识别：url 命中码表固定地址即「码表选项」，否则「自定义」。
  const preset = url === CODE_TABLE_OPTIONS_URL ? "codeTable" : "custom";
  // url 校验：必须 / 开头的站内相对路径（不含 ://，禁外部绝对地址）；空值不提示（未配置态）。
  const urlInvalid = url !== "" && (!url.startsWith("/") || url.includes("://"));

  // params 键值对 -> 行（value 统一转 string 编辑，支持手输 ${fieldId}）。
  const paramRows = Object.entries(source.params ?? {}).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));

  function applyPreset(p: string) {
    if (p === "codeTable") {
      // 码表选项：固定 url/method，用户只需补 params.code。
      onChange({ url: CODE_TABLE_OPTIONS_URL, method: "POST", params: { code: "" }, mapping: {} });
    } else {
      onChange({ url: "", method: "POST", params: {}, mapping: {} });
    }
  }

  function setParams(rows: { key: string; value: string }[]) {
    const params: Record<string, unknown> = {};
    for (const r of rows) params[r.key] = r.value;
    onChange({ params });
  }
  function updateParam(i: number, patch: Partial<{ key: string; value: string }>) {
    setParams(paramRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeParam(i: number) {
    setParams(paramRows.filter((_, idx) => idx !== i));
  }
  function addParam() {
    setParams([...paramRows, { key: `param${paramRows.length + 1}`, value: "" }]);
  }

  // mapping 局部更新：空串转 undefined（留空走默认 label/value/children）。
  function setMapping(patch: Partial<DynamicFormOptionMapping>) {
    const next: DynamicFormOptionMapping = { ...mapping, ...patch };
    for (const k of ["listPath", "labelPath", "valuePath", "childrenPath"] as const) {
      if (next[k] === "") next[k] = undefined;
    }
    onChange({ mapping: next });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      {/* 预设：码表选项 = 固定 /code-table/options，自定义 = 全手填 */}
      <div className="flex items-center gap-2">
        <Label className="w-14 shrink-0 text-xs text-muted-foreground">预设</Label>
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="codeTable">码表选项</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* url + method */}
      <div className="flex items-start gap-2">
        <Label className="w-14 shrink-0 pt-2 text-xs text-muted-foreground">地址</Label>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Input
              value={url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="/code-table/options"
              aria-invalid={urlInvalid}
              className={cn("h-8 flex-1 font-mono", urlInvalid && "border-destructive")}
            />
            <Select value={method} onValueChange={(m) => onChange({ method: m as "GET" | "POST" })}>
              <SelectTrigger className="h-8 w-24 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {urlInvalid && (
            <p className="text-xs text-destructive">地址需以 / 开头的站内相对路径，且不能包含 ://</p>
          )}
        </div>
      </div>

      {/* params 键值对编辑器：value 支持 ${fieldId} 占位，可下拉插入其他字段引用 */}
      <div className="flex items-start gap-2">
        <Label className="w-14 shrink-0 pt-2 text-xs text-muted-foreground">参数</Label>
        <div className="flex flex-1 flex-col gap-1.5">
          {paramRows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={r.key}
                onChange={(e) => updateParam(i, { key: e.target.value })}
                placeholder="参数名"
                className="h-8 w-28 shrink-0 font-mono"
              />
              <Input
                value={r.value}
                onChange={(e) => updateParam(i, { value: e.target.value })}
                placeholder="值，支持 ${fieldId}"
                className="h-8 min-w-0 flex-1 font-mono"
              />
              <FieldRefSelect
                fields={otherFields}
                onPick={(fid) => updateParam(i, { value: `${r.value}\${${fid}}` })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeParam(i)}
                aria-label="删除参数"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addParam} className="self-start">
            <Plus className="h-3.5 w-3.5" />
            添加参数
          </Button>
          {paramRows.length === 0 && (
            <p className="text-xs text-muted-foreground">无请求参数。</p>
          )}
        </div>
      </div>

      {/* mapping：响应字段映射，留空走默认 label/value/children */}
      <div className="flex items-start gap-2">
        <Label className="w-14 shrink-0 pt-2 text-xs text-muted-foreground">映射</Label>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <Input
            value={mapping.listPath ?? ""}
            onChange={(e) => setMapping({ listPath: e.target.value })}
            placeholder="$"
            className="h-8 font-mono"
          />
          <Input
            value={mapping.labelPath ?? ""}
            onChange={(e) => setMapping({ labelPath: e.target.value })}
            placeholder="label"
            className="h-8 font-mono"
          />
          <Input
            value={mapping.valuePath ?? ""}
            onChange={(e) => setMapping({ valuePath: e.target.value })}
            placeholder="value"
            className="h-8 font-mono"
          />
          <Input
            value={mapping.childrenPath ?? ""}
            onChange={(e) => setMapping({ childrenPath: e.target.value })}
            placeholder="children"
            className="h-8 font-mono"
          />
        </div>
      </div>
      <p className="pl-16 text-xs text-muted-foreground">
        依次为列表路径 / 标签 / 值 / 子级字段，留空用默认。
      </p>
    </div>
  );
}

// 插入字段引用下拉：列出其他字段 title，选中回调 fieldId（由调用方拼 ${fieldId}）。
// 选完立即复位回占位，可反复插入；值本身不进 Select（value 恒为 ""）。
function FieldRefSelect({
  fields,
  onPick,
}: {
  fields: DynamicFormField[];
  onPick: (fieldId: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <Select
      value={v}
      onValueChange={(fid) => {
        if (fid === "__none__") return;
        onPick(fid);
        setV(""); // 复位，允许连续插入同一个字段
      }}
    >
      <SelectTrigger className="h-8 w-24 shrink-0" aria-label="插入字段引用">
        <SelectValue placeholder="插入引用" />
      </SelectTrigger>
      <SelectContent position="popper">
        {fields.length === 0 && (
          <SelectItem value="__none__" disabled>
            无其他字段
          </SelectItem>
        )}
        {fields.map((f) => (
          <SelectItem key={f.fieldId} value={f.fieldId}>
            {f.title || f.fieldId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// 表格列编辑弹窗（TABLE 专属）：列 = {key, title} 列表。仿 OptionsDialog「按钮 + 宽 Dialog」壳。
// 列编辑走本地草稿、「完成」才提交——key 是存值键 & React key，重复/为空会撞单元格值，
// 校验（查重 + 非空）不通过时禁用「完成」并内联标红提示。
function TableColumnsDialog({
  columns,
  onChange,
}: {
  columns: DynamicFormTableColumn[];
  onChange: (columns: DynamicFormTableColumn[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DynamicFormTableColumn[]>([]);

  // 打开时快照当前列为草稿；取消（关闭）不提交。
  function openDialog() {
    setDraft(columns.map((c) => ({ ...c })));
    setOpen(true);
  }
  function update(i: number, patch: Partial<DynamicFormTableColumn>) {
    setDraft((d) => d.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function remove(i: number) {
    setDraft((d) => d.filter((_, idx) => idx !== i));
  }
  function add() {
    // key 用短 UUID 保证唯一（用户可改）；title 给可读默认值。
    setDraft((d) => [
      ...d,
      { key: `col_${crypto.randomUUID().slice(0, 6)}`, title: `列${d.length + 1}` },
    ]);
  }

  // key 查重：出现两次及以上的 key 集合。
  const dupKeys = new Set(
    draft.map((c) => c.key).filter((k, i, arr) => arr.indexOf(k) !== i),
  );
  const hasEmptyKey = draft.some((c) => c.key.trim() === "");
  const invalid = dupKeys.size > 0 || hasEmptyKey;

  const summary = columns.length ? `${columns.length} 列` : "配置表格列";

  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-between" onClick={openDialog}>
        <span className="text-muted-foreground">{summary}</span>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>表格列</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            {draft.map((c, i) => {
              const dup = dupKeys.has(c.key);
              const empty = c.key.trim() === "";
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={c.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                    placeholder="列标识 key"
                    aria-invalid={dup || empty}
                    className={cn("h-8 flex-1 font-mono", (dup || empty) && "border-destructive")}
                  />
                  <Input
                    value={c.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder="列名"
                    className="h-8 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(i)}
                    aria-label="删除列"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={add} className="mt-0.5 self-start">
              <Plus className="h-3.5 w-3.5" />
              添加列
            </Button>
            {draft.length === 0 && (
              <p className="text-xs text-muted-foreground">还没有列，点上方按钮添加。</p>
            )}
            {dupKeys.size > 0 && (
              <p className="text-xs text-destructive">列标识 key 重复，请修改后再保存。</p>
            )}
            {hasEmptyKey && (
              <p className="text-xs text-destructive">列标识 key 不能为空。</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              size="sm"
              disabled={invalid}
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { DynamicFormOption } from "@/types";
import type { FieldControlProps } from "./registry";

// 级联选择：options 是树（children 递归）。CASCADER 值=路径数组 ["a","b"]；
// MULTICASCADER 值=二维路径数组 [["a","b"],["c"]]。props.checkStrictly：true=可任选层级，false（默认）=仅叶子。
//
// 交互（统一）：点 label = 展开子项（总是）；选中 = 点圆圈（radio 单选 / checkbox 多选）。
// - 仅叶子模式：只有叶子有圆圈（中间节点只能展开）。
// - checkStrictly：每层都有圆圈（可选任意层级）。
//
// 下拉用内联绝对定位面板（不 portal），不用 Popover：本控件会出现在预览 Dialog 内，
// PopoverContent portal 到 body 会落在 Dialog 的 react-remove-scroll 拦截区外 -> 滚轮失效。
// 内联面板在 Dialog DOM 内 -> 原生 overflow-y-auto 滚轮可用。外部点击 / Esc 用 document 监听。
//
// 配置面板里编辑默认值时用 *Inline 变体（面板平铺、不悬浮）：窄面板里悬浮下拉会被 overflow 裁剪，
// 层级一多显示不全；FieldConfigPanel 把它放进宽 Dialog 用。

function isStrict(field: { props?: Record<string, unknown> }): boolean {
  return field.props?.checkStrictly === true;
}

function levelOptions(options: DynamicFormOption[], drill: string[], depth: number): DynamicFormOption[] {
  let cur = options;
  for (let i = 0; i < depth; i++) {
    const node = cur.find((o) => o.value === drill[i]);
    cur = node?.children ?? [];
  }
  return cur;
}

function labelsOfPath(options: DynamicFormOption[], path: string[]): string[] {
  const labels: string[] = [];
  let cur = options;
  for (const v of path) {
    const node = cur.find((o) => o.value === v);
    if (!node) break;
    labels.push(node.label);
    cur = node.children ?? [];
  }
  return labels;
}

/** 路径 -> 可读标签串（"浙江/杭州/西湖区"），供默认值回显用。 */
export function cascaderPathLabels(options: DynamicFormOption[], path: string[]): string {
  return labelsOfPath(options, path).join("/");
}

const isLeaf = (n: DynamicFormOption) => !(n.children && n.children.length);

/** 过滤 visible===false 的选项（预览/填表时隐藏）；级联递归处理 children。 */
export function visibleOptions(options: DynamicFormOption[]): DynamicFormOption[] {
  return options
    .filter((o) => o.visible !== false)
    .map((o) => (o.children ? { ...o, children: visibleOptions(o.children) } : o));
}
const pathKey = (p: string[]) => p.join("");

// 外部点击 / Esc 关闭。
function useCloseOnOutside(open: boolean, onClose: () => void, rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, rootRef]);
}

// ---- 面板列（悬浮/内联共用）：横向多列，每列一级的选项 ----
function DrillColumns({
  options,
  drill,
  onDrill,
  strict,
  multi,
  isSelected,
  onPick,
  floating,
}: {
  options: DynamicFormOption[];
  drill: string[];
  onDrill: (drill: string[]) => void;
  strict: boolean;
  multi: boolean;
  isSelected: (key: string) => boolean;
  onPick: (node: DynamicFormOption, depth: number, on: boolean) => void;
  floating?: boolean;
}) {
  const expand = (node: DynamicFormOption, depth: number) =>
    onDrill([...drill.slice(0, depth), node.value]);

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md",
        floating && "absolute left-0 top-full z-50 mt-1",
      )}
    >
      {Array.from({ length: drill.length + 1 }, (_, depth) => {
        const opts = levelOptions(options, drill, depth);
        // 仅根列（depth 0）为空时提示；子列为空（父项无子项/子项全隐藏）不渲染提示、不展开空列。
        const isEmpty = opts.length === 0;
        if (isEmpty && depth > 0) return null;
        return (
          <div
            key={depth}
            className="max-h-64 w-44 shrink-0 overflow-y-auto border-r p-1 last:border-r-0"
          >
            {isEmpty && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">暂无可用选项</p>
            )}
            {opts.map((node) => {
              const leaf = isLeaf(node);
              const selectable = leaf || strict;
              const key = pathKey([...drill.slice(0, depth), node.value]);
              const active = drill[depth] === node.value;
              return (
                <div
                  key={node.value}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    active && "bg-accent font-medium",
                  )}
                >
                  {selectable ? (
                    multi ? (
                      <Checkbox
                        checked={isSelected(key)}
                        onCheckedChange={(c) => onPick(node, depth, c === true)}
                        className="shrink-0"
                      />
                    ) : (
                      // 单选圆圈（自绘，不依赖 RadioGroup：面板可能不在 RadioGroup 上下文里）。
                      <button
                        type="button"
                        onClick={() => onPick(node, depth, true)}
                        aria-label="选中"
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isSelected(key) ? "border-primary" : "border-input hover:border-primary/60",
                        )}
                      >
                        {isSelected(key) && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    )
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => expand(node, depth)}
                    className="flex min-w-0 flex-1 items-center text-left"
                  >
                    <span className="min-w-0 flex-1 truncate">{node.label}</span>
                    {!leaf && (
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ---- CASCADER（单选级联，值=路径数组）----
export function CascaderControl({ field, value, onChange, disabled }: FieldControlProps) {
  // showAllOptions：联动 VALUE 赋值场景列全部选项（含 visible=false），显隐不生效。
  const options = useMemo(
    () => (field.props?.showAllOptions ? (field.options ?? []) : visibleOptions(field.options ?? [])),
    [field.options, field.props?.showAllOptions],
  );
  const strict = isStrict(field);
  const path = Array.isArray(value) ? (value as string[]) : [];
  const [open, setOpen] = useState(false);
  const [drill, setDrill] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutside(open, () => { setOpen(false); setDrill([]); }, rootRef);

  const display = path.length ? cascaderPathLabels(options, path).split("/").join(" / ") : "";
  const selectedKey = pathKey(path);

  function select(node: DynamicFormOption, depth: number) {
    onChange([...drill.slice(0, depth), node.value]);
    setOpen(false);
    setDrill([]);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
          !display && "text-muted-foreground",
        )}
      >
        <span className="truncate">{display || field.placeholder || "请选择"}</span>
        {/* 末尾位互斥：有值显 ×（点击清空），无值显 chevron。占同一位置。 */}
        {!disabled && path.length > 0 ? (
          <button
            type="button"
            aria-label="清空"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="shrink-0 rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>
      {open && (
        <DrillColumns
          floating
          options={options}
          drill={drill}
          onDrill={setDrill}
          strict={strict}
          multi={false}
          isSelected={(key) => key === selectedKey}
          onPick={(node, depth) => select(node, depth)}
        />
      )}
    </div>
  );
}

// ---- MULTICASCADER（多选级联，值=二维路径数组；已选显示在框内）----
export function MultiCascaderControl({ field, value, onChange, disabled }: FieldControlProps) {
  const options = useMemo(
    () => (field.props?.showAllOptions ? (field.options ?? []) : visibleOptions(field.options ?? [])),
    [field.options, field.props?.showAllOptions],
  );
  const strict = isStrict(field);
  const paths: string[][] = useMemo(
    () => (Array.isArray(value) ? (value as string[][]) : []),
    [value],
  );
  const [open, setOpen] = useState(false);
  const [drill, setDrill] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutside(open, () => { setOpen(false); setDrill([]); }, rootRef);

  const selected = useMemo(() => new Set(paths.map(pathKey)), [paths]);

  function toggle(node: DynamicFormOption, depth: number, on: boolean) {
    const newPath = [...drill.slice(0, depth), node.value];
    const key = pathKey(newPath);
    onChange(on ? [...paths, newPath] : paths.filter((p) => pathKey(p) !== key));
  }
  function removePath(key: string) {
    onChange(paths.filter((p) => pathKey(p) !== key));
  }

  return (
    <div ref={rootRef} className="relative">
      {/* 触发框：已选项直接填进框内（多选 tag 平铺，可单个移除）。 */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!disabled) setOpen((o) => !o); } }}
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:bg-accent/50",
        )}
      >
        {paths.length === 0 && (
          <span className="px-1 text-muted-foreground">{field.placeholder || "请选择"}</span>
        )}
        {paths.map((p) => {
          const key = pathKey(p);
          return (
            <span
              key={key}
              className="flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
            >
              {cascaderPathLabels(options, p)}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePath(key); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="移除"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        {/* 末尾位互斥：有值显 ×（清空全部），无值显 chevron。 */}
        {!disabled && paths.length > 0 ? (
          <button
            type="button"
            aria-label="清空全部"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="ml-auto shrink-0 self-center rounded-full p-0.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 self-center opacity-50" />
        )}
      </div>

      {open && (
        <DrillColumns
          floating
          options={options}
          drill={drill}
          onDrill={setDrill}
          strict={strict}
          multi
          isSelected={(key) => selected.has(key)}
          onPick={(node, depth, on) => toggle(node, depth, on)}
        />
      )}
    </div>
  );
}

// ---- 内联变体（配置面板默认值用：面板平铺不悬浮，放宽 Dialog 里）----
export function CascaderInline({ field, value, onChange }: FieldControlProps) {
  const options = useMemo(() => visibleOptions(field.options ?? []), [field.options]);
  const strict = isStrict(field);
  const path = Array.isArray(value) ? (value as string[]) : [];
  // drill 初始定位到当前选中路径的父级，让已选项所在列可见。
  const [drill, setDrill] = useState<string[]>(() => path.slice(0, -1));
  const selectedKey = pathKey(path);

  return (
    <div className="overflow-x-auto">
      <DrillColumns
        options={options}
        drill={drill}
        onDrill={setDrill}
        strict={strict}
        multi={false}
        isSelected={(key) => key === selectedKey}
        onPick={(node, depth) => onChange([...drill.slice(0, depth), node.value])}
      />
    </div>
  );
}

export function MultiCascaderInline({ field, value, onChange }: FieldControlProps) {
  const options = useMemo(() => visibleOptions(field.options ?? []), [field.options]);
  const strict = isStrict(field);
  const paths: string[][] = useMemo(
    () => (Array.isArray(value) ? (value as string[][]) : []),
    [value],
  );
  const [drill, setDrill] = useState<string[]>([]);
  const selected = useMemo(() => new Set(paths.map(pathKey)), [paths]);

  function toggle(node: DynamicFormOption, depth: number, on: boolean) {
    const newPath = [...drill.slice(0, depth), node.value];
    const key = pathKey(newPath);
    onChange(on ? [...paths, newPath] : paths.filter((p) => pathKey(p) !== key));
  }

  return (
    <div className="overflow-x-auto">
      <DrillColumns
        options={options}
        drill={drill}
        onDrill={setDrill}
        strict={strict}
        multi
        isSelected={(key) => selected.has(key)}
        onPick={(node, depth, on) => toggle(node, depth, on)}
      />
    </div>
  );
}

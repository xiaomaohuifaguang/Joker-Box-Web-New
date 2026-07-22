"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { visibleOptions } from "./CascaderControl";
import type { FieldControlProps } from "./registry";

// 下拉多选（MULTISELECT）：触发框内平铺已选 tag + 点开下拉面板 checkbox 多选。
// 和「多选框 CHECKBOX」（平铺 checkbox 组）区分：MULTISELECT 收进下拉、选项多时更省地方。
//
// 下拉用内联绝对定位面板（不 portal），不用 Popover：预览 Dialog 内 PopoverContent portal 到 body
// 会落在 Dialog 的 react-remove-scroll 拦截区外 -> 滚轮失效（同级联，见 CascaderControl）。
export function MultiSelectControl({ field, value, onChange, disabled }: FieldControlProps) {
  const options = useMemo(() => visibleOptions(field.options ?? []), [field.options]);
  const arr: string[] = useMemo(() => (Array.isArray(value) ? (value as string[]) : []), [value]);
  const selected = useMemo(() => new Set(arr), [arr]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string, on: boolean) =>
    onChange(on ? [...arr, v] : arr.filter((x) => x !== v));

  return (
    <div ref={rootRef} className="relative">
      {/* 触发框：已选 tag 平铺，可单个移除。 */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setOpen((o) => !o);
          }
        }}
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:bg-accent/50",
        )}
      >
        {arr.length === 0 && (
          <span className="px-1 text-muted-foreground">{field.placeholder || "请选择"}</span>
        )}
        {arr.map((v) => (
          <span
            key={v}
            className="flex items-center gap-0.5 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
          >
            {labelOf(v)}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v, false);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="移除"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {/* 末尾位互斥：有值显 ×（清空全部），无值显 chevron。 */}
        {!disabled && arr.length > 0 ? (
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
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="max-h-60 overflow-y-auto">
            {options.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">暂无可用选项</p>
            )}
            {options.map((o) => {
              const on = selected.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value, !on)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                    on && "bg-accent/60",
                  )}
                >
                  <Checkbox checked={on} className="pointer-events-none shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {on && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

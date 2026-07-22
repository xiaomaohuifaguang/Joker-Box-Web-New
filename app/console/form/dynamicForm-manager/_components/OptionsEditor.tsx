"use client";

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DynamicFormOption } from "@/types";

// 生成全局唯一 option value（短 UUID），避免手动编号在增删/嵌套时重复。
function genValue(): string {
  return `opt_${crypto.randomUUID().slice(0, 8)}`;
}

// 选项编辑器：选项类字段的 label/value 列表。cascade=true 时支持 children 嵌套（级联字段）。
// 每项带 visible 眼睛切换：visible=false 时该选项在预览/填表时隐藏（编辑器内仍显示，划掉示意）。
export function OptionsEditor({
  options,
  onChange,
  cascade = false,
  depth = 0,
}: {
  options: DynamicFormOption[];
  onChange: (options: DynamicFormOption[]) => void;
  cascade?: boolean;
  depth?: number;
}) {
  function update(i: number, patch: Partial<DynamicFormOption>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function remove(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }
  function add() {
    const n = options.length + 1;
    // value 用短 UUID 保证唯一（用户可改）；label 给可读默认值；visible 默认 true。
    onChange([...options, { label: `选项${n}`, value: genValue(), visible: true }]);
  }
  function addChild(i: number) {
    const children = options[i].children ?? [];
    const n = children.length + 1;
    update(i, {
      children: [...children, { label: `子项${n}`, value: genValue(), visible: true }],
    });
  }
  function updateChildren(i: number, children: DynamicFormOption[]) {
    update(i, { children: children.length ? children : undefined });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o, i) => {
        const hidden = o.visible === false;
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              {/* 显隐切换：visible=false 预览/填表时隐藏该选项（编辑器内仍可见，划掉示意）。 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0",
                  hidden ? "text-muted-foreground/60 hover:text-foreground" : "text-muted-foreground hover:text-brand",
                )}
                onClick={() => update(i, { visible: hidden })}
                aria-label={hidden ? "显示该选项" : "隐藏该选项"}
                title={hidden ? "显示该选项" : "隐藏该选项"}
              >
                {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Input
                value={o.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="标签"
                className={cn("h-8 flex-1", hidden && "text-muted-foreground line-through")}
              />
              <Input
                value={o.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="值"
                className={cn("h-8 flex-1 font-mono", hidden && "text-muted-foreground line-through")}
              />
              {cascade && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-brand"
                  onClick={() => addChild(i)}
                  aria-label="添加子级"
                  title="添加子级"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
                aria-label="删除选项"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* 嵌套子级（级联）。层级多时减小缩进避免拥挤。 */}
            {cascade && o.children && o.children.length > 0 && (
              <div className="ml-2 border-l pl-1.5">
                <OptionsEditor
                  options={o.children}
                  onChange={(children) => updateChildren(i, children)}
                  cascade
                  depth={depth + 1}
                />
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add} className="mt-0.5">
        <Plus className="h-3.5 w-3.5" />
        添加{depth > 0 ? "子级" : "选项"}
      </Button>
      {options.length === 0 && depth === 0 && (
        <p className="text-xs text-muted-foreground">还没有选项，点上方按钮添加。</p>
      )}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs text-muted-foreground">{children}</Label>;
}

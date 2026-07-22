"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DynamicFormOption } from "@/types";

// 选项编辑器：选项类字段（SELECT/MULTISELECT/RADIO/CHECKBOX）的 label/value 列表。
export function OptionsEditor({
  options,
  onChange,
}: {
  options: DynamicFormOption[];
  onChange: (options: DynamicFormOption[]) => void;
}) {
  function update(i: number, patch: Partial<DynamicFormOption>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function remove(i: number) {
    onChange(options.filter((_, idx) => idx !== i));
  }
  function add() {
    const n = options.length + 1;
    onChange([...options, { label: `选项${n}`, value: `opt${n}` }]);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={o.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="标签"
            className="h-8 flex-1"
          />
          <Input
            value={o.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="值"
            className="h-8 flex-1 font-mono"
          />
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
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="mt-0.5">
        <Plus className="h-3.5 w-3.5" />
        添加选项
      </Button>
      {options.length === 0 && (
        <p className="text-xs text-muted-foreground">还没有选项，点上方按钮添加。</p>
      )}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs text-muted-foreground">{children}</Label>;
}

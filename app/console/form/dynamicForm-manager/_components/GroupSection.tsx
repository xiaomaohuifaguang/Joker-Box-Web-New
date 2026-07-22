"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DynamicFormField } from "@/types";
import { FieldContainer } from "./FormCanvas";
import { groupKey, type DesignerApi } from "./designer-state";

// 分组容器：标题（可改/折叠/删除）+ 字段列表（FieldContainer，可跨组拖入）。
export function GroupSection({
  group,
  designer,
  selectedId,
  onSelect,
  onRemoveField,
}: {
  group: { name: string; collapsed?: string; fields: DynamicFormField[]; description?: string; id?: string; clientId?: string; sort?: number };
  designer: DesignerApi;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemoveField: (id: string) => void;
}) {
  const key = groupKey(group);
  const collapsed = group.collapsed === "1";
  return (
    <div className="rounded-md border bg-surface">
      <div
        className="flex items-center gap-1 border-b px-2 py-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => designer.updateGroup(key, { collapsed: collapsed ? "0" : "1" })}
          className="text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "展开分组" : "折叠分组"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
        <input
          value={group.name}
          onChange={(e) => designer.updateGroup(key, { name: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none"
          placeholder="分组名称"
        />
        <button
          type="button"
          onClick={() => designer.removeGroup(key)}
          className="text-muted-foreground hover:text-destructive"
          aria-label="删除分组（字段回到未分组）"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {!collapsed && (
        <FieldContainer
          containerId={key}
          fields={group.fields}
          selectedId={selectedId}
          onSelect={onSelect}
          onRemove={onRemoveField}
        />
      )}
    </div>
  );
}

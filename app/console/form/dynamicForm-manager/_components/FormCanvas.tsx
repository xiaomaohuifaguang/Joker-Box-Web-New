"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DynamicFormField } from "@/types";
import { FIELD_REGISTRY } from "./fields/registry";
import { UNGROUPED_ID, groupKey, type DesignerApi } from "./designer-state";
import { GroupSection } from "./GroupSection";

// 画布：未分组（顶部固定）+ 各分组。dnd-kit 多容器跨组拖拽排序。
export function FormCanvas({
  designer,
  selectedId,
  onSelect,
}: {
  designer: DesignerApi;
  selectedId: string | null;
  onSelect: (fieldId: string | null) => void;
}) {
  const { state, moveField, removeField } = designer;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // fieldId -> 容器 id（dnd 用）。
  function containerOf(fieldId: string): string | null {
    if (state.fields.some((f) => f.fieldId === fieldId)) return UNGROUPED_ID;
    for (const g of state.groups) {
      if (g.fields.some((f) => f.fieldId === fieldId)) return groupKey(g);
    }
    return null;
  }

  // 容器 id -> 该容器内 fieldId 列表。
  function fieldsOf(containerId: string): string[] {
    if (containerId === UNGROUPED_ID) return state.fields.map((f) => f.fieldId);
    return (
      state.groups.find((g) => groupKey(g) === containerId)?.fields.map((f) => f.fieldId) ?? []
    );
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeFieldId = String(active.id);
    const overId = String(over.id);

    // over 可能是某字段，也可能是容器（group 容器 id / UNGROUPED_ID）。
    const overIsContainer = overId === UNGROUPED_ID || state.groups.some((g) => groupKey(g) === overId);
    const targetContainer = overIsContainer ? overId : containerOf(overId);
    if (!targetContainer) return;

    let toIndex: number;
    if (overIsContainer) {
      toIndex = fieldsOf(targetContainer).length; // 落到容器空白 -> 末尾
    } else {
      toIndex = fieldsOf(targetContainer).indexOf(overId);
      if (toIndex < 0) toIndex = fieldsOf(targetContainer).length;
    }
    moveField(activeFieldId, targetContainer, toIndex);
  }

  const activeField = activeId
    ? [...state.fields, ...state.groups.flatMap((g) => g.fields)].find((f) => f.fieldId === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-3" onClick={() => onSelect(null)}>
        {/* 未分组（固定顶部） */}
        <FieldContainer
          containerId={UNGROUPED_ID}
          title="未分组"
          fields={state.fields}
          selectedId={selectedId}
          onSelect={onSelect}
          onRemove={removeField}
        />
        {/* 分组 */}
        {state.groups.map((g) => (
          <GroupSection
            key={groupKey(g)}
            group={g}
            designer={designer}
            selectedId={selectedId}
            onSelect={onSelect}
            onRemoveField={removeField}
          />
        ))}
        {state.fields.length === 0 && state.groups.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            从左侧字段库点击添加字段
          </div>
        )}
      </div>
      <DragOverlay>
        {activeField ? <FieldCardPreview field={activeField} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// 一个容器（未分组或分组）的可排序字段列表。
export function FieldContainer({
  containerId,
  title,
  fields,
  selectedId,
  onSelect,
  onRemove,
}: {
  containerId: string;
  title?: string;
  fields: DynamicFormField[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-md border bg-surface">
      {title != null && (
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{title}</div>
      )}
      <SortableContext items={fields.map((f) => f.fieldId)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-wrap gap-2 p-2" data-container={containerId}>
          {fields.length === 0 ? (
            <DroppableEmpty containerId={containerId} />
          ) : (
            fields.map((f) => (
              <SortableFieldCard
                key={f.fieldId}
                field={f}
                selected={f.fieldId === selectedId}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// 空容器的可拖入占位（让跨组拖到空组有落点）。
function DroppableEmpty({ containerId }: { containerId: string }) {
  const { setNodeRef } = useSortable({ id: containerId, disabled: true });
  return (
    <div
      ref={setNodeRef}
      className="flex h-12 w-full items-center justify-center rounded border border-dashed text-xs text-muted-foreground"
    >
      拖字段到这里
    </div>
  );
}

// 字段卡（可拖、可选中、按 span 占位宽度）。
function SortableFieldCard({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  field: DynamicFormField;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.fieldId,
  });
  const span = field.span ?? 24;
  // span/24 -> 宽度百分比（预留 gap）。
  const widthPct = `${(span / 24) * 100}%`;
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        width: `calc(${widthPct} - 4px)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(field.fieldId);
      }}
      className={cn(
        "group flex items-center gap-1 rounded-md border bg-background px-2 py-2 text-sm",
        isDragging && "opacity-40",
        selected ? "border-brand ring-1 ring-brand/40" : "hover:border-muted-foreground/40",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate">
        {field.title}
        <span className="ml-1.5 text-xs text-muted-foreground">{FIELD_REGISTRY[field.type].label}</span>
        {field.required === "1" && <span className="ml-1 text-destructive">*</span>}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(field.fieldId);
        }}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        aria-label="删除字段"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FieldCardPreview({ field }: { field: DynamicFormField }) {
  return (
    <div className="flex w-64 items-center gap-1 rounded-md border border-brand bg-background px-2 py-2 text-sm shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="truncate">{field.title}</span>
    </div>
  );
}

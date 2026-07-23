"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  DynamicForm,
  DynamicFormField,
  DynamicFormFieldGroup,
  DynamicFormLinkageRule,
  DynamicFormSavePayload,
} from "@/types";

// 未分组容器 id（dnd-kit droppable）。
export const UNGROUPED_ID = "__ungrouped__";

// 设计器内部状态：名称/描述 + 未分组字段 + 分组列表。
export interface DesignerState {
  name: string;
  description: string;
  fields: DynamicFormField[]; // 未分组
  groups: DynamicFormFieldGroup[];
  linkageRules: DynamicFormLinkageRule[]; // 联动规则
}

export function emptyState(): DesignerState {
  return { name: "", description: "", fields: [], groups: [], linkageRules: [] };
}

// 从详情 DynamicForm 初始化编辑态（未分组字段 + 分组，分组补 clientId）。
export function stateFromForm(form: DynamicForm): DesignerState {
  return {
    name: form.name ?? "",
    description: form.description ?? "",
    fields: (form.fields ?? []).map((f) => ({ ...f })),
    groups: (form.groups ?? []).map((g) => ({
      ...g,
      clientId: g.id ?? crypto.randomUUID(),
      fields: (g.fields ?? []).map((f) => ({ ...f })),
    })),
    linkageRules: (form.linkageRules ?? []).map((r) => ({ ...r })),
  };
}

// 转保存 payload（去掉 clientId）。
export function toPayload(s: DesignerState, id?: string): DynamicFormSavePayload {
  return {
    id,
    name: s.name.trim(),
    description: s.description.trim() || undefined,
    fields: s.fields.map(stripClient),
    groups: s.groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      sort: g.sort,
      collapsed: g.collapsed ?? "0",
      fields: g.fields.map(stripClient),
    })),
    linkageRules: s.linkageRules,
  };
}

function stripClient(f: DynamicFormField): DynamicFormField {
  const { ...rest } = f;
  return rest;
}

// 字段位置索引：fieldId -> 所在容器（UNGROUPED_ID 或 group clientId/id）。
export function locateField(
  s: DesignerState,
  fieldId: string,
): { containerId: string; index: number } | null {
  const i = s.fields.findIndex((f) => f.fieldId === fieldId);
  if (i >= 0) return { containerId: UNGROUPED_ID, index: i };
  for (const g of s.groups) {
    const key = groupKey(g);
    const j = g.fields.findIndex((f) => f.fieldId === fieldId);
    if (j >= 0) return { containerId: key, index: j };
  }
  return null;
}

export function groupKey(g: DynamicFormFieldGroup): string {
  return g.clientId ?? g.id ?? g.name;
}

// 设计器状态操作 hook：字段/分组的增删改 + 跨容器移动。
export function useDesignerState(initial?: DynamicForm) {
  const [state, setState] = useState<DesignerState>(() =>
    initial ? stateFromForm(initial) : emptyState(),
  );

  // 一次性初始化/重置整个状态（编辑回显用）。
  const reset = useCallback((next: DesignerState) => setState(next), []);

  const setMeta = useCallback((name: string, description: string) => {
    setState((s) => ({ ...s, name, description }));
  }, []);

  // 取某容器的字段数组（不可变副本）。
  const getContainer = useCallback(
    (s: DesignerState, containerId: string): DynamicFormField[] =>
      containerId === UNGROUPED_ID
        ? s.fields
        : (s.groups.find((g) => groupKey(g) === containerId)?.fields ?? []),
    [],
  );

  // 写回某容器的字段数组。
  const writeContainer = useCallback(
    (
      s: DesignerState,
      containerId: string,
      fields: DynamicFormField[],
    ): DesignerState => {
      if (containerId === UNGROUPED_ID) return { ...s, fields };
      return {
        ...s,
        groups: s.groups.map((g) =>
          groupKey(g) === containerId ? { ...g, fields } : g,
        ),
      };
    },
    [],
  );

  // 新增字段到指定容器末尾。
  const addField = useCallback(
    (field: DynamicFormField, containerId: string) => {
      setState((s) => {
        const arr = [...getContainer(s, containerId), field];
        return writeContainer(s, containerId, arr);
      });
    },
    [getContainer, writeContainer],
  );

  // 更新字段属性。
  const updateField = useCallback(
    (fieldId: string, patch: Partial<DynamicFormField>) => {
      setState((s) => {
        const loc = locateField(s, fieldId);
        if (!loc) return s;
        const arr = getContainer(s, loc.containerId).map((f) =>
          f.fieldId === fieldId ? { ...f, ...patch } : f,
        );
        return writeContainer(s, loc.containerId, arr);
      });
    },
    [getContainer, writeContainer],
  );

  // 删除字段。
  const removeField = useCallback(
    (fieldId: string) => {
      setState((s) => {
        const loc = locateField(s, fieldId);
        if (!loc) return s;
        const arr = getContainer(s, loc.containerId).filter(
          (f) => f.fieldId !== fieldId,
        );
        return writeContainer(s, loc.containerId, arr);
      });
    },
    [getContainer, writeContainer],
  );

  // 移动字段：from 容器 -> to 容器 的 toIndex（跨组拖拽 + 组内排序）。
  const moveField = useCallback(
    (fieldId: string, toContainerId: string, toIndex: number) => {
      setState((s) => {
        const loc = locateField(s, fieldId);
        if (!loc) return s;
        const field = getContainer(s, loc.containerId)[loc.index];
        if (!field) return s;

        // 同容器：移除后插入（注意索引偏移）。
        if (loc.containerId === toContainerId) {
          const arr = getContainer(s, loc.containerId).filter(
            (f) => f.fieldId !== fieldId,
          );
          const idx = toIndex > loc.index ? toIndex - 1 : toIndex;
          arr.splice(Math.max(0, Math.min(arr.length, idx)), 0, field);
          return writeContainer(s, loc.containerId, arr);
        }
        // 跨容器。
        const fromArr = getContainer(s, loc.containerId).filter(
          (f) => f.fieldId !== fieldId,
        );
        const toArr = [...getContainer(s, toContainerId)];
        toArr.splice(Math.max(0, Math.min(toArr.length, toIndex)), 0, field);
        const next = writeContainer(s, loc.containerId, fromArr);
        return writeContainer(next, toContainerId, toArr);
      });
    },
    [getContainer, writeContainer],
  );

  // 分组操作。
  const addGroup = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      groups: [
        ...s.groups,
        {
          name,
          sort: s.groups.length,
          collapsed: "0",
          fields: [],
          clientId: crypto.randomUUID(),
        },
      ],
    }));
  }, []);

  const updateGroup = useCallback(
    (key: string, patch: Partial<DynamicFormFieldGroup>) => {
      setState((s) => ({
        ...s,
        groups: s.groups.map((g) =>
          groupKey(g) === key ? { ...g, ...patch } : g,
        ),
      }));
    },
    [],
  );

  const removeGroup = useCallback((key: string) => {
    setState((s) => {
      const g = s.groups.find((x) => groupKey(x) === key);
      if (!g) return s;
      // 组内字段回收到未分组，避免丢字段。
      return {
        ...s,
        fields: [...s.fields, ...g.fields],
        groups: s.groups.filter((x) => groupKey(x) !== key),
      };
    });
  }, []);

  const moveGroup = useCallback((key: string, toIndex: number) => {
    setState((s) => {
      const from = s.groups.findIndex((g) => groupKey(g) === key);
      if (from < 0) return s;
      const arr = [...s.groups];
      const [g] = arr.splice(from, 1);
      arr.splice(Math.max(0, Math.min(arr.length, toIndex)), 0, g);
      return { ...s, groups: arr.map((x, i) => ({ ...x, sort: i })) };
    });
  }, []);

  // ---- 联动规则 ----
  const addRule = useCallback((rule: DynamicFormLinkageRule) => {
    setState((s) => ({ ...s, linkageRules: [...s.linkageRules, rule] }));
  }, []);

  const updateRule = useCallback((index: number, rule: DynamicFormLinkageRule) => {
    setState((s) => ({
      ...s,
      linkageRules: s.linkageRules.map((r, i) => (i === index ? rule : r)),
    }));
  }, []);

  const removeRule = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      linkageRules: s.linkageRules.filter((_, i) => i !== index),
    }));
  }, []);

  const moveRule = useCallback((from: number, to: number) => {
    setState((s) => {
      const arr = [...s.linkageRules];
      const [r] = arr.splice(from, 1);
      arr.splice(Math.max(0, Math.min(arr.length, to)), 0, r);
      return { ...s, linkageRules: arr.map((x, i) => ({ ...x, sortOrder: i })) };
    });
  }, []);

  const allGroupNames = useMemo(
    () => state.groups.map((g) => g.name),
    [state.groups],
  );

  return {
    state,
    reset,
    setMeta,
    addField,
    updateField,
    removeField,
    moveField,
    addGroup,
    updateGroup,
    removeGroup,
    moveGroup,
    addRule,
    updateRule,
    removeRule,
    moveRule,
    allGroupNames,
  };
}

export type DesignerApi = ReturnType<typeof useDesignerState>;

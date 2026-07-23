"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DynamicFormTableColumn } from "@/types";
import type { FieldControlProps } from "./registry";

// 动态表格（TABLE）：值 = Record<列key, string>[]（行对象数组）。
// 列 = field.tableColumns（设计器配置）；单元格统一为单行文本 Input。
// 添加/删除整行，编辑单元格；disabled 只读展示（隐藏增删、禁用输入）。
export default function TableControl({ value, onChange, disabled, field }: FieldControlProps) {
  const rows: Record<string, string>[] = Array.isArray(value)
    ? (value as Record<string, string>[])
    : [];
  const columns: DynamicFormTableColumn[] = field.tableColumns ?? [];

  // 无列兜底：预览时设计器没配列。
  if (columns.length === 0) {
    return <p className="text-xs text-muted-foreground">请先在字段配置添加表格列</p>;
  }

  // 新行：每列 key 初始空串。
  const addRow = () => {
    const row: Record<string, string> = {};
    for (const col of columns) row[col.key] = "";
    onChange([...rows, row]);
  };

  const setCell = (r: number, key: string, v: string) =>
    onChange(rows.map((row, i) => (i === r ? { ...row, [key]: v } : row)));

  const removeRow = (r: number) => onChange(rows.filter((_, i) => i !== r));

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-muted-foreground"
              >
                {col.title}
              </th>
            ))}
            {!disabled && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b last:border-b-0">
              {columns.map((col) => (
                <td key={col.key} className="min-w-32 px-2 py-1.5">
                  <Input
                    value={row[col.key] ?? ""}
                    onChange={(e) => setCell(r, col.key, e.target.value)}
                    disabled={disabled}
                    className="h-8 bg-background"
                  />
                </td>
              ))}
              {!disabled && (
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    aria-label="删除行"
                    className="rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <div className="border-t p-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" />
            添加行
          </Button>
        </div>
      )}
    </div>
  );
}

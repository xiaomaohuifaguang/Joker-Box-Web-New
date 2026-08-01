"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDynamicFormInfo } from "@/lib/api/dynamicForm";
import { ApiError } from "@/lib/api";
import type { DynamicFormField, ProcessNodeFieldPermission } from "@/types";

// 字段权限（ProcessNodeFieldPermission.permission）。VISIBLE=默认（不收录入库）。
type FieldPermission = ProcessNodeFieldPermission["permission"] | "VISIBLE";

const PERMISSION_OPTIONS: Array<{ value: FieldPermission; label: string }> = [
  { value: "VISIBLE", label: "可见" },
  { value: "READONLY", label: "只读" },
  { value: "HIDDEN", label: "隐藏" },
  { value: "REQUIRED", label: "必填" },
];

// 主表单的一个展示分区：未分组字段 + 各分组（保持表单设计的组排版）。
interface PermissionSection {
  key: string;
  title: string;
  fields: DynamicFormField[];
}

// 节点字段权限（fieldPermissions，开始/用户任务勾选 inheritMainForm 后显示）。
// 字段来源=流程主表单（globalFormBinding 的 formId+formVersion，经 /dynamicForm/info 拉设计配置）。
// 面板里只放一个触发按钮（显示已设非默认项数）；点击开宽 Dialog 配置——字段多时不受右栏宽度限制。
// 按「未分组 / 各分组」分区排版，每字段一个权限选择；仅收录非默认权限（VISIBLE 不入 node.data）。
// Dialog 内改动实时写入 node.data.fieldPermissions（无暂存，所见即所存）；顶部「批量设置」应用到全部字段。
export function NodeFieldPermissions({
  formId,
  formVersion,
  value,
  readOnly,
  onChange,
}: {
  /** 主表单 id（globalFormBinding.formId，此时必非空） */
  formId: string;
  /** 主表单版本（globalFormBinding.formVersion，此时必非空） */
  formVersion: string;
  /** 当前 fieldPermissions（node.data，仅非默认项） */
  value: ProcessNodeFieldPermission[];
  readOnly: boolean;
  onChange: (next: ProcessNodeFieldPermission[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<PermissionSection[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // 打开 Dialog 后拉主表单设计配置（重置在打开按钮 onClick 里做，避免 effect 内同步 setState）。组装 未分组+分组 分区。
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getDynamicFormInfo(formId, formVersion)
      .then((form) => {
        if (cancelled) return;
        const list: PermissionSection[] = [];
        if ((form.fields?.length ?? 0) > 0) {
          list.push({ key: "__ungrouped__", title: "未分组", fields: form.fields ?? [] });
        }
        for (const g of form.groups ?? []) {
          list.push({
            key: g.id ?? g.clientId ?? g.name,
            title: g.name || "分组",
            fields: g.fields ?? [],
          });
        }
        setSections(list);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(true);
        toast.error(err instanceof ApiError ? err.message : "加载表单字段失败");
      });
    return () => {
      cancelled = true;
    };
  }, [open, formId, formVersion]);

  // fieldKey → 当前权限（默认 VISIBLE）。
  const permMap = new Map(value.map((p) => [p.fieldKey, p.permission]));
  function permissionOf(fieldKey: string): FieldPermission {
    return permMap.get(fieldKey) ?? "VISIBLE";
  }

  // 应用权限到一组 fieldKey：非默认(VISIBLE)覆盖/新增、默认则移除，结果仅收录非默认。
  function applyPermissions(fieldKeys: string[], permission: FieldPermission) {
    const next = new Map(value.map((p) => [p.fieldKey, p.permission] as const));
    for (const key of fieldKeys) {
      if (permission === "VISIBLE") next.delete(key);
      else next.set(key, permission);
    }
    onChange([...next.entries()].map(([fieldKey, perm]) => ({ fieldKey, permission: perm })));
  }

  // 批量设置：把某权限应用到主表单全部字段（VISIBLE=全恢复可见=清空）。
  function applyAll(permission: FieldPermission) {
    if (permission === "VISIBLE") {
      onChange([]);
      return;
    }
    const allKeys = (sections ?? []).flatMap((s) => s.fields.map((f) => f.fieldId));
    onChange(allKeys.map((fieldKey) => ({ fieldKey, permission })));
  }

  const totalFields = (sections ?? []).reduce((n, s) => n + s.fields.length, 0);

  // 打开 Dialog：重置加载态（sections=null→显加载中），再经 effect 拉取。
  function openDialog() {
    setSections(null);
    setLoadError(false);
    setOpen(true);
  }

  return (
    <>
      {/* 触发按钮：显示已设非默认权限的字段数。 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={openDialog}
      >
        <ListChecks className="h-4 w-4" />
        配置字段权限
        {value.length > 0 && (
          <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
            {value.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>字段权限</DialogTitle>
            <DialogDescription>
              配置主表单各字段在本节点的权限；未列出的字段默认「可见」，不入库。
            </DialogDescription>
          </DialogHeader>

          {/* 全局批量设置：选权限即应用到全部字段（不留选中态——执行动作而非配置值）。 */}
          {!readOnly && sections !== null && totalFields > 0 && (
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-xs">全部字段</Label>
              <Select value="" onValueChange={(v) => applyAll(v as FieldPermission)}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="将所有字段设为…" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {PERMISSION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      全部{o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 字段列表（分区，可滚动）。 */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadError ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                表单字段加载失败，请关闭后重试
              </p>
            ) : sections === null ? (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">加载表单字段…</p>
            ) : totalFields === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                主表单暂无可配置字段
              </p>
            ) : (
              <div className="flex flex-col gap-3 pr-1">
                {sections.map((section) => {
                  // 命令式收集字段行，避免在响应式嵌套 map 里渲染 <Select>（react-hooks/static-components 误报）。
                  const rows: React.ReactNode[] = [];
                  section.fields.forEach((f, i) => {
                    const perm = permissionOf(f.fieldId);
                    rows.push(
                      <div
                        key={f.fieldId}
                        className={cn("flex items-center gap-3 px-3 py-2", i > 0 && "border-t")}
                      >
                        <span title={f.title || f.fieldId} className="min-w-0 flex-1 truncate text-sm">
                          {f.title || f.fieldId}
                        </span>
                        <Select
                          value={perm}
                          onValueChange={(v) => applyPermissions([f.fieldId], v as FieldPermission)}
                          disabled={readOnly}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 w-24 shrink-0 text-xs",
                              perm !== "VISIBLE" && "border-primary/50 text-primary",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {PERMISSION_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>,
                    );
                  });
                  return (
                    <div key={section.key} className="overflow-hidden rounded-md border">
                      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                          {section.title}
                        </span>
                        {/* 分区批量：把权限应用到本组全部字段（可见=本组全恢复可见）。 */}
                        {!readOnly && section.fields.length > 0 && (
                          <Select
                            value=""
                            onValueChange={(v) =>
                              applyPermissions(section.fields.map((f) => f.fieldId), v as FieldPermission)
                            }
                          >
                            <SelectTrigger className="h-6 w-20 shrink-0 border-dashed px-1.5 text-[10px] text-muted-foreground">
                              <SelectValue placeholder="批量" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {PERMISSION_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex flex-col">{rows}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}

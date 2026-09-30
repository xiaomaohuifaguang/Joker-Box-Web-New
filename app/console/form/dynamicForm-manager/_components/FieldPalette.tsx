"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, LayoutTemplate, Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DynamicFormField, DynamicFormFieldGroupTemplate, DynamicFormFieldType } from "@/types";
import { FIELD_GROUPS, FIELD_REGISTRY } from "./fields/registry";
import { fieldFromTemplate, groupFromTemplate } from "@/app/console/form/fieldTemplate";
import { UNGROUPED_ID } from "./designer-state";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { GroupTemplatePickerDialog } from "./GroupTemplatePickerDialog";

// 左栏字段库：顶部「从模板插入」/「从组合模板插入」+ 分组列出所有字段类型，点击弹出「添加到分组」对话框。
export function FieldPalette({
  groupNames,
  onAdd,
  onAddTemplate,
  onAddGroupTemplate,
}: {
  groupNames: string[];
  onAdd: (type: DynamicFormFieldType, containerId: string, newGroupName?: string) => void;
  onAddTemplate: (field: DynamicFormField, containerId: string, newGroupName?: string) => void;
  onAddGroupTemplate: (
    tpl: DynamicFormFieldGroupTemplate,
    containerId: string,
    newGroupName?: string,
  ) => void;
}) {
  const [pending, setPending] = useState<DynamicFormFieldType | null>(null);
  // 模板插入：选中的模板已转换为字段（fieldId 已重生成、id/value 已剥），待选目标分组。
  const [pendingTemplate, setPendingTemplate] = useState<{
    title: string;
    field: DynamicFormField;
  } | null>(null);
  // 组合模板插入：选中的组合模板（groupFromTemplate 在 FormDesigner 插入时转换），待选目标分组。
  const [pendingGroupTemplate, setPendingGroupTemplate] =
    useState<DynamicFormFieldGroupTemplate | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setPickerOpen(true)}
        >
          <LayoutTemplate className="h-4 w-4" />
          从模板插入
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setGroupPickerOpen(true)}
        >
          <Layers className="h-4 w-4" />
          从组合模板插入
        </Button>
      </div>
      {FIELD_GROUPS.map((group) => {
        const items = Object.values(FIELD_REGISTRY).filter((m) => m.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <div className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{group}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((m) => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => setPending(m.type)}
                  className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-left text-sm transition-colors hover:border-brand hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(tpl) => {
          const field = fieldFromTemplate(tpl, 0);
          if (!field) {
            toast.error("模板内容无法解析");
            return;
          }
          setPendingTemplate({ title: tpl.title || "字段模板", field });
        }}
      />
      <GroupTemplatePickerDialog
        open={groupPickerOpen}
        onOpenChange={setGroupPickerOpen}
        onPick={(tpl) => {
          // 校验可解析（fieldsTemplate 合法）才进分组选择；真正转换在 FormDesigner 插入时做。
          if (!groupFromTemplate(tpl, 0)) {
            toast.error("组合模板内容无法解析");
            return;
          }
          setPendingGroupTemplate(tpl);
        }}
      />
      {pending != null && (
        <AddFieldDialog
          label={FIELD_REGISTRY[pending].label}
          groupNames={groupNames}
          onClose={() => setPending(null)}
          onConfirm={(containerId, newGroupName) => {
            onAdd(pending, containerId, newGroupName);
            setPending(null);
          }}
        />
      )}
      {pendingTemplate != null && (
        <AddFieldDialog
          label={pendingTemplate.title}
          groupNames={groupNames}
          onClose={() => setPendingTemplate(null)}
          onConfirm={(containerId, newGroupName) => {
            onAddTemplate(pendingTemplate.field, containerId, newGroupName);
            setPendingTemplate(null);
          }}
        />
      )}
      {pendingGroupTemplate != null && (
        <AddFieldDialog
          label={pendingGroupTemplate.title || "字段组合模板"}
          groupNames={groupNames}
          onClose={() => setPendingGroupTemplate(null)}
          onConfirm={(containerId, newGroupName) => {
            onAddGroupTemplate(pendingGroupTemplate, containerId, newGroupName);
            setPendingGroupTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// 「添加字段到分组」对话框：Combobox 选已有分组（联想）/ 未分组 / 输入新建分组。
// label = 弹窗标题里展示的名称（类型 label 或模板标题）。
function AddFieldDialog({
  label,
  groupNames,
  onClose,
  onConfirm,
}: {
  label: string;
  groupNames: string[];
  onClose: () => void;
  onConfirm: (containerId: string, newGroupName?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // 选中的目标："" = 未分组；否则分组名。
  const [target, setTarget] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? groupNames.filter((n) => n.toLowerCase().includes(q)) : groupNames;
  }, [groupNames, query]);

  const trimmed = query.trim();
  const canCreate = trimmed && !groupNames.includes(trimmed);
  const display = target === "" ? "未分组" : target;

  function confirm() {
    // 优先用正在输入的 query 作为新分组（若用户输了但没选）。
    if (canCreate && target === "") {
      onConfirm("", trimmed); // 新建分组
    } else if (target === "" ) {
      onConfirm(UNGROUPED_ID);
    } else if (canCreate && target === trimmed) {
      onConfirm("", trimmed);
    } else {
      // target 是已有分组名
      if (groupNames.includes(target)) onConfirm(target);
      else onConfirm("", target); // 当作新建
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>添加「{label}」</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>目标分组</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="justify-between font-normal">
                {display}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="搜索或输入新分组名..." value={query} onValueChange={setQuery} />
                <CommandList>
                  <CommandEmpty>无匹配分组</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="__ungrouped__"
                      onSelect={() => {
                        setTarget("");
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", target === "" ? "opacity-100" : "opacity-0")} />
                      未分组
                    </CommandItem>
                    {filtered.map((n) => (
                      <CommandItem
                        key={n}
                        value={n}
                        onSelect={() => {
                          setTarget(n);
                          setQuery("");
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", target === n ? "opacity-100" : "opacity-0")} />
                        {n}
                      </CommandItem>
                    ))}
                    {canCreate && (
                      <CommandItem
                        value={`create-${trimmed}`}
                        onSelect={() => {
                          onConfirm("", trimmed);
                          setOpen(false);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        新建分组「{trimmed}」
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={confirm}>添加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

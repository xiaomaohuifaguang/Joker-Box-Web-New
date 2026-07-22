"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import type { DynamicFormFieldType } from "@/types";
import { FIELD_GROUPS, FIELD_REGISTRY } from "./fields/registry";
import { UNGROUPED_ID } from "./designer-state";

// 左栏字段库：分组列出所有字段类型，点击弹出「添加到分组」对话框。
export function FieldPalette({
  groupNames,
  onAdd,
}: {
  groupNames: string[];
  onAdd: (type: DynamicFormFieldType, containerId: string, newGroupName?: string) => void;
}) {
  const [pending, setPending] = useState<DynamicFormFieldType | null>(null);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
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
      {pending != null && (
        <AddFieldDialog
          type={pending}
          groupNames={groupNames}
          onClose={() => setPending(null)}
          onConfirm={(containerId, newGroupName) => {
            onAdd(pending, containerId, newGroupName);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

// 「添加字段到分组」对话框：Combobox 选已有分组（联想）/ 未分组 / 输入新建分组。
function AddFieldDialog({
  type,
  groupNames,
  onClose,
  onConfirm,
}: {
  type: DynamicFormFieldType;
  groupNames: string[];
  onClose: () => void;
  onConfirm: (containerId: string, newGroupName?: string) => void;
}) {
  const meta = FIELD_REGISTRY[type];
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
          <DialogTitle>添加「{meta.label}」</DialogTitle>
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

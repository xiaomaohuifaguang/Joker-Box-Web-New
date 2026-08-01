"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Send } from "lucide-react";
import { getDeployList } from "@/lib/api/process";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DeployedProcessDefinition } from "@/types";
import { StartProcessDialog } from "./StartProcessDialog";

// 发起流程区块：搜索式下拉选择已部署流程 + 「发起」按钮，弹出标题对话框。
export function StartProcessSection({
  onStarted,
}: {
  onStarted: (kind: "start" | "draft") => void;
}) {
  const [list, setList] = useState<DeployedProcessDefinition[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDeployList()
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => list?.find((d) => d.id === selectedId) ?? null,
    [list, selectedId],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list ?? [];
    return (list ?? []).filter((d) =>
      (d.processName ?? "").toLowerCase().includes(q),
    );
  }, [list, query]);

  if (list == null) {
    return <Skeleton className="h-9 w-full max-w-md rounded-md" />;
  }
  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无已发布的流程可发起。</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full max-w-md justify-between font-normal"
          >
            <span className="truncate">
              {selected
                ? `${selected.processName ?? "未命名流程"}${selected.version ? ` · v${selected.version}` : ""}`
                : "选择要发起的流程"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="搜索流程名称..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>无匹配流程</CommandEmpty>
              <CommandGroup>
                {filtered.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`${d.processName ?? ""} ${d.id}`}
                    onSelect={() => {
                      setSelectedId(d.id ?? null);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === d.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{d.processName ?? "未命名流程"}</span>
                    {d.version && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        v{d.version}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button disabled={selected == null} onClick={() => setDialogOpen(true)}>
        <Send className="h-4 w-4" />
        发起
      </Button>

      <StartProcessDialog
        definition={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={onStarted}
      />
    </div>
  );
}

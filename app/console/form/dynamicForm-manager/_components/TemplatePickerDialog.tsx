"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DynamicFormFieldTemplate } from "@/types";
import { useDynamicFormFieldTemplatePage } from "@/hooks/useDynamicFormFieldTemplatePage";
import { parseFieldTemplate } from "@/app/console/form/fieldTemplate";
import { FIELD_REGISTRY } from "./fields/registry";

const PAGE_SIZE = 10;

// 取模板的字段类型 label；fieldTemplate JSON 损坏/类型未知 -> null（该行禁选）。
function typeLabel(tpl: DynamicFormFieldTemplate): string | null {
  const f = parseFieldTemplate(tpl.fieldTemplate);
  return f ? (FIELD_REGISTRY[f.type]?.label ?? null) : null;
}

// 模板选择弹窗：搜索 + 分页 + 单选，确定后 onPick。数据损坏的模板禁选。
export function TemplatePickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (tpl: DynamicFormFieldTemplate) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [selected, setSelected] = useState<DynamicFormFieldTemplate | null>(null);

  // 打开时重置搜索/页码/选中（render 期 prev-state 模式，避免 effect 内同步 setState）。
  const [prevOpen, setPrevOpen] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSearchInput("");
      setSearch("");
      setCurrent(1);
      setSelected(null);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useDynamicFormFieldTemplatePage({
    search,
    current,
    size: PAGE_SIZE,
    refreshKey: 0,
  });

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>从模板插入</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索模板"
            className="h-9 pl-8"
          />
        </div>

        <div className="flex max-h-[50vh] min-h-40 flex-col gap-1.5 overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : records.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {search ? "无匹配模板" : "暂无模板，先到「字段模板管理」创建"}
            </div>
          ) : (
            records.map((tpl) => {
              const label = typeLabel(tpl);
              const active = selected?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={!label}
                  onClick={() => setSelected(tpl)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                    label
                      ? "hover:border-brand hover:bg-accent"
                      : "cursor-not-allowed opacity-50",
                    active && "border-brand bg-accent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {tpl.title || "(未命名)"}
                    </span>
                    {tpl.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {tpl.description}
                      </span>
                    )}
                  </span>
                  <Badge variant={label ? "secondary" : "destructive"}>
                    {label ?? "数据异常"}
                  </Badge>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>共 {total} 条</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={current <= 1}
              onClick={() => setCurrent((c) => Math.max(1, c - 1))}
              aria-label="上一页"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              {current} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={current >= totalPages}
              onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
              aria-label="下一页"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onPick(selected);
              onOpenChange(false);
            }}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

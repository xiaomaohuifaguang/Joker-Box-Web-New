"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MENU_ICON_GROUPS, MenuIcon } from "@/components/menuIcons";

// 图标选择器：自定义内联下拉面板（不用 Popover / Portal）。
// 原因：本选择器在编辑 Dialog 内，PopoverContent 被 portal 到 body，落在 Dialog 的
// react-remove-scroll 拦截区外 -> 滚轮被拦截（试过 ScrollArea、本地 overflow、非被动
// wheel 监听均失败）。改用 Dialog 内的内联绝对定位面板：不 portal -> 在 RemoveScroll
// 允许区内 -> 本地 overflow 滚轮原生可用。外部点击 / Esc 关闭用 document 监听。
export function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // 搜索跨类别过滤；无命中的类别整体隐藏。
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MENU_ICON_GROUPS;
    return MENU_ICON_GROUPS.map((g) => ({
      label: g.label,
      icons: g.icons.filter((n) => n.toLowerCase().includes(q)),
    })).filter((g) => g.icons.length > 0);
  }, [search]);

  // 外部点击 / Esc 关闭面板。
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 flex-1 justify-start gap-2 font-normal"
          onClick={() => setOpen((o) => !o)}
        >
          <MenuIcon name={value} className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm">{value || "选择图标"}</span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 shrink-0"
            onClick={() => onChange("")}
            aria-label="清除图标"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索图标"
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {filteredGroups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-1 pb-1 pt-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                  {group.label}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {group.icons.map((name) => {
                    const active = name === value;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => pick(name)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-accent",
                          active && "border-brand bg-brand/10 text-brand",
                        )}
                      >
                        <MenuIcon name={name} className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                无匹配图标
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

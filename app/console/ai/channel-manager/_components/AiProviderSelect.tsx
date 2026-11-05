"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryAiProviderPage } from "@/lib/api/aiProvider";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";

// 供应商远程搜索单选。下拉面板内联渲染，避免 Dialog 拦截 portal 面板滚轮。
export function AiProviderSelect({
  value,
  selectedName,
  disabled,
  onChange,
}: {
  value?: number;
  selectedName?: string;
  disabled?: boolean;
  onChange: (id?: number, name?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // 输入变化立即进入加载态；实际请求在 effect 中防抖触发。
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setLoading(true);
    setLoadError(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      queryAiProviderPage({
        search: search || undefined,
        current: 1,
        size: 20,
      })
        .then((page) => {
          if (!cancelled) setOptions(page.records ?? []);
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
            setLoadError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, reloadKey]);

  const selectedOption = options.find((provider) => provider.id === value);
  const selectedLabel = value == null
    ? "自定义渠道"
    : selectedOption?.name || selectedName || `供应商 #${value}`;

  function toggleOpen() {
    if (disabled) return;
    if (!open) {
      setLoading(true);
      setLoadError(false);
    }
    setOpen((current) => !current);
  }

  function select(id?: number, name?: string) {
    onChange(id, name);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={toggleOpen}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div
          id={panelId}
          className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="relative border-b p-2">
            <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索供应商"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => select()}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="flex-1">自定义渠道</span>
              {value == null && <Check className="h-4 w-4" />}
            </button>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                加载中…
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2 py-3 text-xs text-muted-foreground">
                <span>供应商加载失败</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    setLoadError(false);
                    setReloadKey((key) => key + 1);
                  }}
                >
                  重试
                </Button>
              </div>
            ) : options.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">无匹配供应商</p>
            ) : (
              options.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => select(provider.id, provider.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                    provider.id === value && "bg-accent/60",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{provider.name || `供应商 #${provider.id}`}</span>
                  {provider.id === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

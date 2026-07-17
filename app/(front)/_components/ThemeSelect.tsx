"use client";

import { useEffect, useRef, useState } from "react";
import { PRESETS } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";

// 主题预设切换：下拉菜单（点击展开，外部点击关闭）。
export function ThemeSelect() {
  const { preset, setPreset } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];

  // 展开时点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-32 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        aria-label="主题预设"
        aria-expanded={open}
      >
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: current.swatch }}
        />
        <span className="font-display">{current.name}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border bg-surface shadow-lg">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-background ${
                p.id === preset ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: p.swatch }}
              />
              <span className="flex-1">{p.name}</span>
              {p.id === preset && <span className="text-brand">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

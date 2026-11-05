"use client";

import { Check, Moon, PanelLeft, PanelTop, Sun } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFrontLayout } from "@/hooks/useFrontLayout";
import { useTheme } from "@/hooks/useTheme";
import { PRESETS } from "@/lib/theme";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-1.5 text-xs font-medium text-muted-foreground">{children}</p>;
}

// 外观设置内容：明暗、布局（仅前台）、主题预设。桌面在 AppearanceMenu 浮层里，移动端内联进菜单。
export function AppearancePanel({ showLayout = false }: { showLayout?: boolean }) {
  const { scheme, toggleScheme, preset, setPreset } = useTheme();
  const { layout, toggleLayout } = useFrontLayout();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>明暗</SectionLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          value={scheme}
          onValueChange={(v) => {
            if (v && v !== scheme) toggleScheme();
          }}
          className="w-full"
        >
          <ToggleGroupItem value="light" className="flex-1">
            <Sun className="h-4 w-4" />
            浅色
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="flex-1">
            <Moon className="h-4 w-4" />
            深色
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {showLayout && (
        <div>
          <SectionLabel>导航布局</SectionLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={layout}
            onValueChange={(v) => {
              if (v && v !== layout) toggleLayout();
            }}
            className="w-full"
          >
            <ToggleGroupItem value="top" className="flex-1">
              <PanelTop className="h-4 w-4" />
              顶栏
            </ToggleGroupItem>
            <ToggleGroupItem value="side" className="flex-1">
              <PanelLeft className="h-4 w-4" />
              侧栏
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div>
        <SectionLabel>主题</SectionLabel>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === preset}
              onClick={() => setPreset(p.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                p.id === preset && "bg-brand/12 font-medium hover:bg-brand/18",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.swatch }}
              />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {p.id === preset && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

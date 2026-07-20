"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cascadeServerGroup } from "@/lib/api/apiPath";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Cascade } from "@/types";

// 服务/分组级联选择器：扁平两级列表，服务和分组都能选。
// 选服务 -> 传 { server, groupName: "" }；选分组 -> 传 { server, groupName }。
// 清空 -> 传 { server: "", groupName: "" }。
export function ServerGroupCascader({
  server,
  groupName,
  onChange,
}: {
  server: string;
  groupName: string;
  onChange: (server: string, groupName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Cascade[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    cascadeServerGroup()
      .then((d) => {
        if (!cancelled) setData(d ?? []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label = useMemo(() => {
    if (!server && !groupName) return "全部服务/分组";
    if (server && groupName) return `${server} / ${groupName}`;
    return server;
  }, [server, groupName]);

  // 扁平化：服务行 + 其下分组行，带缩进。搜索时跨层匹配（服务匹配则显示其所有分组）。
  const flatList = useMemo(() => {
    if (!data) return [];
    type Row = {
      type: "server" | "group";
      value: string;
      label: string;
      server: string;
      groupName: string;
      depth: number;
    };
    const rows: Row[] = [];
    const q = search.toLowerCase();
    for (const svc of data) {
      const svcMatch = !q || svc.label.toLowerCase().includes(q);
      const kids = svc.children ?? [];
      // 服务行：搜索匹配时显示，或其子项匹配时也显示
      const hasKidMatch = kids.some(
        (k) => !q || k.label.toLowerCase().includes(q),
      );
      if (svcMatch || hasKidMatch) {
        rows.push({
          type: "server",
          value: svc.value,
          label: svc.label,
          server: svc.value,
          groupName: "",
          depth: 0,
        });
      }
      // 分组行：搜索匹配时显示（服务也匹配时全显示）
      for (const grp of kids) {
        if (!q || svcMatch || grp.label.toLowerCase().includes(q)) {
          if (svcMatch || hasKidMatch) {
            rows.push({
              type: "group",
              value: `${svc.value}/${grp.value}`,
              label: grp.label,
              server: svc.value,
              groupName: grp.value,
              depth: 1,
            });
          }
        }
      }
    }
    return rows;
  }, [data, search]);

  function handleSelect(server: string, groupName: string) {
    onChange(server, groupName);
    setOpen(false);
    setSearch("");
  }

  function isRowSelected(row: { server: string; groupName: string }) {
    return row.server === server && row.groupName === groupName;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 justify-between gap-2 text-sm"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索服务/分组"
              className="h-8 pl-7 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {/* 全部 */}
          <button
            type="button"
            onClick={() => handleSelect("", "")}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              !server && !groupName && "font-medium text-foreground",
            )}
          >
            全部服务/分组
            {!server && !groupName && (
              <Check className="h-3.5 w-3.5 text-brand" />
            )}
          </button>
          {/* 服务/分组列表 */}
          {flatList.map((row) => (
            <button
              key={row.value}
              type="button"
              onClick={() => handleSelect(row.server, row.groupName)}
              style={{ paddingLeft: `${8 + row.depth * 16}px` }}
              className={cn(
                "flex w-full items-center justify-between rounded-md py-1.5 pr-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                isRowSelected(row) && "font-medium text-foreground",
                row.type === "server" && "font-medium",
              )}
            >
              <span className="truncate">{row.label}</span>
              {isRowSelected(row) && (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
              )}
            </button>
          ))}
          {flatList.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              无匹配项
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// JSON 结构化树：对象/数组可折叠（带类型与计数），叶子带类型色。
export function JsonTree({ data }: { data: unknown }) {
  return <JsonNode k={null} value={data} />;
}

function JsonNode({ k, value }: { k: string | null; value: unknown }) {
  if (value === null) {
    return <Leaf k={k} value="null" className="text-muted-foreground" />;
  }
  if (Array.isArray(value)) {
    return (
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="group flex w-full items-center gap-1 py-0.5 text-left text-sm">
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          {k !== null && <span className="text-foreground">{k}</span>}
          {k !== null && <span className="text-muted-foreground">: </span>}
          <span className="font-mono text-xs text-muted-foreground">
            Array({value.length})
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-3 border-l border-border pl-3">
            {value.length === 0 ? (
              <EmptyLeaf />
            ) : (
              value.map((v, i) => <JsonNode key={i} k={String(i)} value={v} />)
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="group flex w-full items-center gap-1 py-0.5 text-left text-sm">
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          {k !== null && <span className="text-foreground">{k}</span>}
          {k !== null && <span className="text-muted-foreground">: </span>}
          <span className="font-mono text-xs text-muted-foreground">
            Object({entries.length})
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-3 border-l border-border pl-3">
            {entries.length === 0 ? (
              <EmptyLeaf />
            ) : (
              entries.map(([key, v]) => <JsonNode key={key} k={key} value={v} />)
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  if (typeof value === "string") {
    return <Leaf k={k} value={`"${value}"`} className="text-felt" />;
  }
  if (typeof value === "number") {
    return <Leaf k={k} value={String(value)} className="text-brand" />;
  }
  if (typeof value === "boolean") {
    return <Leaf k={k} value={String(value)} className="text-felt" />;
  }
  return null;
}

function Leaf({
  k,
  value,
  className,
}: {
  k: string | null;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1 py-0.5 pl-4 font-mono text-sm">
      {k !== null && <span className="text-foreground">{k}</span>}
      {k !== null && <span className="text-muted-foreground">: </span>}
      <span className={className}>{value}</span>
    </div>
  );
}

function EmptyLeaf() {
  return (
    <div className="py-0.5 pl-4 font-mono text-xs text-muted-foreground">空</div>
  );
}

"use client";

import { PanelLeft, PanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFrontLayout } from "@/hooks/useFrontLayout";

// 前台布局切换：顶栏导航 <-> 左侧栏导航（localStorage 持久化，见 lib/front-layout.ts）。
// 用于前台 Header 右侧与侧栏模式 inset 顶栏。
export function LayoutToggle() {
  const { layout, toggleLayout } = useFrontLayout();
  const toSide = layout === "top";
  const label = toSide ? "切换侧栏布局" : "切换顶栏布局";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLayout}
          aria-label={label}
          className="text-muted-foreground"
        >
          {toSide ? <PanelLeft className="h-4 w-4" /> : <PanelTop className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

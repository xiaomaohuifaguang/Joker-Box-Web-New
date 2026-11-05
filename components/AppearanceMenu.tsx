"use client";

import { Palette } from "lucide-react";
import { AppearancePanel } from "@/components/AppearancePanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// 顶栏外观入口：把明暗、布局、主题预设收进一个按钮。
export function AppearanceMenu({ showLayout = false }: { showLayout?: boolean }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="外观设置"
              className="text-muted-foreground"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>外观设置</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72">
        <AppearancePanel showLayout={showLayout} />
      </PopoverContent>
    </Popover>
  );
}

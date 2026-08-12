"use client";

import { History, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ChatModel } from "@/types";

// 抽屉顶栏：模型选择 + 流式开关 + 新建会话（主操作，带文字） + 历史会话（激活态高亮）。
export function AiChatHeader({
  models, modelId, onModelChange, stream, onStreamChange, onNewSession, onToggleSessions, sessionsActive,
}: {
  models: ChatModel[];
  modelId: string;
  onModelChange: (id: string) => void;
  stream: boolean;
  onStreamChange: (v: boolean) => void;
  onNewSession: () => void;
  onToggleSessions: () => void;
  /** 会话列表是否打开（历史钮高亮）。 */
  sessionsActive: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b py-3 pl-4 pr-12">
      <Select value={modelId} onValueChange={onModelChange}>
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent position="popper">
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          size="sm"
          checked={stream}
          onCheckedChange={onStreamChange}
          aria-label="流式输出"
        />
        流式
      </label>
      {/* 新建会话：主操作，描边带文字更醒目。 */}
      <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs" onClick={onNewSession}>
        <SquarePen className="h-3.5 w-3.5" />
        新会话
      </Button>
      {/* 历史会话：悬停底色 + 列表打开时高亮（激活态）。 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 shrink-0", sessionsActive && "bg-accent text-accent-foreground")}
        onClick={onToggleSessions}
        aria-label="历史会话"
        title="历史会话"
      >
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}

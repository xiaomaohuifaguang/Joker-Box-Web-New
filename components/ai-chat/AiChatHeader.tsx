"use client";

import { History, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ChatModel } from "@/types";

// 抽屉顶栏：模型选择 + 新建会话 + 历史会话切换。
export function AiChatHeader({
  models, modelId, onModelChange, onNewSession, onToggleSessions,
}: {
  models: ChatModel[];
  modelId: string;
  onModelChange: (id: string) => void;
  onNewSession: () => void;
  onToggleSessions: () => void;
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
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewSession} aria-label="新建会话" title="新建会话">
        <SquarePen className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSessions} aria-label="历史会话" title="历史会话">
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}

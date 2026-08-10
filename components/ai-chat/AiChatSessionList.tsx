"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

// 会话历史列表（Sheet 内切换视图）。进入时刷新一次。
export function AiChatSessionList({
  sessions, activeId, onSelect, onRefresh,
}: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
}) {
  // 打开列表时拉最新会话（effect 内仅异步回调 setState，在 hook 里）。
  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col p-2">
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无会话</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              onClick={() => onSelect(s.sessionId)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                s.sessionId === activeId && "bg-accent",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{s.title || "未命名会话"}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{s.updateTime?.slice(5, 16)}</span>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

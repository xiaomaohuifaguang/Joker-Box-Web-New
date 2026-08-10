"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { UiMessage } from "@/hooks/useAiChat";

// 单条思考块：有 reason 才显示。流式思考中（无 content）默认展开+呼吸；开始输出 content 自动折叠（可手开）。
function ReasonBlock({
  reason,
  thinking,
  hasContent,
}: {
  reason: string;
  /** 仍在思考（流式且无 content）。 */
  thinking: boolean;
  /** 已开始输出正文 content。 */
  hasContent: boolean;
}) {
  // 思考中默认展开；content 一出现自动折叠（render 期条件 setState，避开 set-state-in-effect）。
  const [open, setOpen] = useState(true);
  const [prevHasContent, setPrevHasContent] = useState(hasContent);
  if (prevHasContent !== hasContent) {
    setPrevHasContent(hasContent);
    if (hasContent) setOpen(false);
  }
  return (
    <div className="mb-1 rounded-md border border-border/60 bg-muted/40 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-muted-foreground"
      >
        {thinking && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>{thinking ? "思考中…" : "思考过程"}</span>
        <ChevronDown className={cn("ml-auto h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="whitespace-pre-wrap px-2 pb-2 pt-0.5 text-muted-foreground/90">{reason}</div>
      )}
    </div>
  );
}

// 消息流：user 右 / assistant 左；滚动容器，新消息自动滚到底。
export function AiChatMessages({
  messages, loading,
}: {
  messages: UiMessage[];
  streaming: boolean;
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息到达平滑滚到底；流式追加（pending）用 auto 避免叠加动画（effect 只操作 DOM，不 setState）。
  const anyPending = messages.some((m) => m.pending);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: anyPending ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, anyPending]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载消息…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        开始新的对话吧
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.key} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {m.role === "assistant" && m.reason && (
                <ReasonBlock
                  reason={m.reason}
                  thinking={!!m.pending && !m.content}
                  hasContent={!!m.content}
                />
              )}
              {m.content && (
                <div className="whitespace-pre-wrap break-words">
                  {m.content}
                  {m.pending && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />}
                </div>
              )}
              {m.pending && !m.content && !m.reason && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

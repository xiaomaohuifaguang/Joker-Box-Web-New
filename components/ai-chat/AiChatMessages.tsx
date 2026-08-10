"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { UiMessage } from "@/hooks/useAiChat";

// 单条思考块：有 reason 才显示。流式思考中（无 content）默认展开+呼吸；开始输出 content 自动折叠。
function ReasonBlock({ reason, streaming }: { reason: string; streaming: boolean }) {
  const thinking = streaming && reason.length > 0;
  const [open, setOpen] = useState(true);
  // 思考结束（开始输出 content）时自动折叠：streaming 转 false 或 content 出现由父级控制 open 初始。
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

  // 消息/流式内容变化时滚到底（effect 只操作 DOM，不 setState）。
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

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
                <ReasonBlock reason={m.reason} streaming={!!m.pending && !m.content} />
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

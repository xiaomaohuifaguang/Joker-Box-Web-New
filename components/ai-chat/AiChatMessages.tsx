"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { UiMessage } from "@/hooks/useAiChat";
import { AiMarkdown } from "./AiMarkdown";

// 单条思考块（signature「进程终端」）：mono 字体 + felt 左竖线 + 弱化底。
// 打字机效果：pending 一进来就亮卡（哪怕 reason 还空），标题实时计时「思考中 · Ns」，
// reason 逐字往外冒 + 跟随光标；正文 content 一出现自动折叠（可手开）。
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
  // 初始 open 由 hasContent 定：流式完成 key 变更触发 remount、或历史消息（本就有 content）时默认折叠，
  // 不会把已折叠的思考块又展开。
  const [open, setOpen] = useState(() => !hasContent);
  const [prevHasContent, setPrevHasContent] = useState(hasContent);
  if (prevHasContent !== hasContent) {
    setPrevHasContent(hasContent);
    if (hasContent) setOpen(false);
  }

  // 静默期/思考中的已用秒数：thinking 期间每秒 +1（异步回调 setState），结束后定格。
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!thinking) return;
    const iv = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [thinking]);

  return (
    <div
      className={cn(
        "mb-2 rounded-r-md border-l-2 border-felt/60 bg-muted/40 font-mono text-xs",
        // 思考中的呼吸微光（felt 淡染，随主题）。
        thinking && "animate-pulse",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-muted-foreground"
      >
        <Terminal className="h-3 w-3 text-felt" />
        <span className="tracking-wide">
          {thinking ? `思考中 · ${elapsed}s` : "思考过程"}
        </span>
        {thinking && <Loader2 className="h-3 w-3 animate-spin text-felt" />}
        <ChevronDown className={cn("ml-auto h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="whitespace-pre-wrap px-2.5 pb-2.5 pt-0.5 leading-relaxed text-muted-foreground/90">
          {reason}
          {thinking && (
            // 跟随光标：文字逐字增长时贴在末尾，营造打字机感。
            <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-felt align-middle" />
          )}
          {thinking && !reason && (
            <span className="text-muted-foreground/60">正在整理思路…</span>
          )}
        </div>
      )}
    </div>
  );
}

// 单条助手消息的「复制全文」钮：hover 浮现（移动端常驻，见 globals.css .ai-md-msgops）。
function CopyMsgBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  }
  return (
    <div className="ai-md-msgops mt-1 flex justify-end">
      <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="复制全文" title="复制全文">
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

// 消息流：user 右 / assistant 左；滚动容器，新消息自动滚到底。
export function AiChatMessages({
  messages, loading,
}: {
  messages: UiMessage[];
  loading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // 是否贴着底部（贴底才跟随新消息滚动；用户上翻后不被拽回）。
  const stickToBottomRef = useRef(true);
  const [showBackToBottom, setShowBackToBottom] = useState(false);

  // 新消息到达平滑滚到底；流式追加（pending）用 auto 避免叠加动画（effect 只操作 DOM，不 setState）。
  // 仅在贴底时跟随——用户上翻阅读历史时不强拉到底。
  const anyPending = messages.some((m) => m.pending);
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({
      behavior: anyPending ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, anyPending]);

  // 监听 ScrollArea viewport 滚动，更新贴底标记 + 回到底部浮钮显隐。
  // setState 只在 scroll 事件回调里（异步），不违反 set-state-in-effect。
  // 依赖 loading/有无消息：loading 态与空态提前 return，viewport 会随之卸载/重建，需重新绑定。
  const hasMessages = messages.length > 0;
  useEffect(() => {
    const viewport = bottomRef.current?.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;
    const onScroll = () => {
      const nearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
      stickToBottomRef.current = nearBottom;
      setShowBackToBottom(!nearBottom);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [loading, hasMessages]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载消息…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Terminal className="h-5 w-5 text-felt" />
        <p className="font-display text-lg tracking-tight text-foreground">开始新的对话</p>
        <p className="text-sm text-muted-foreground">输入问题，Enter 发送</p>
      </div>
    );
  }

  return (
    // relative 容器：回到底部浮钮的定位祖先（不滚动），ScrollArea 仍 flex-1 内部滚动。
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-4 py-3">
        <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.key} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user" ? (
              // 用户：唯一实心气泡（brand），右侧。
              <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            ) : (
              // 助手：无气泡——felt 左竖线 + 裸 markdown 散文，读起来像正在书写的文档（编辑感）。
              // group/msg：hover 浮现消息操作条（复制全文）。min-w-0：flex 项默认 min-width:auto，
              // 内容（宽代码/mermaid）会把容器撑破导致右侧被裁——给 0 让 flex 收缩、内部靠 overflow-x 滚动。
              <div className="group/msg relative min-w-0 max-w-full flex-1 border-l border-felt/40 pl-3 text-sm">
                {(m.reason || m.pending) && (
                  // pending 即渲染（静默期也亮卡计时）；历史/完成后只在有 reason 时显示。
                  <ReasonBlock
                    reason={m.reason}
                    thinking={!!m.pending && !m.content}
                    hasContent={!!m.content}
                  />
                )}
                {m.content && (
                  <div className="relative">
                    <AiMarkdown content={m.content} plain={!!m.pending} />
                    {m.pending && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />
                    )}
                  </div>
                )}
                {!m.pending && m.content && <CopyMsgBtn text={m.content} />}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {showBackToBottom && (
        // 回到底部浮钮：作 ScrollArea 的兄弟节点（viewport 会随内容滚动，不能放其内），
        // 绝对定位于外层 relative 容器右下，任何滚动位置都钉在消息区角落。
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-3 right-3 z-10 shadow-md"
          onClick={() => {
            stickToBottomRef.current = true;
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" /> 回到底部
        </Button>
      )}
    </div>
  );
}

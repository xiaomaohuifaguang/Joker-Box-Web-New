"use client";

import { useState } from "react";
import { BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";
import { useAiChat } from "@/hooks/useAiChat";
import { cn } from "@/lib/utils";
import { AiChatHeader } from "./AiChatHeader";
import { AiChatMessages } from "./AiChatMessages";
import { AiChatInput } from "./AiChatInput";
import { AiChatSessionList } from "./AiChatSessionList";

// AI 会话助手：右下角悬浮钮 + 右侧抽屉。前后台各挂一份（共享本组件）。
// 仅登录后可见（接口需 token）；useMounted 防 hydration（token 是 client-only）。
// 面板拆成 AiChatPanel 内层组件：仅登录挂载——useAiChat 的请求才不会对未登录空跑。
// 数据懒加载：点开面板才 chat.init()（拉 models/sessions，内部 ref 保证只拉一次），
// 页面加载不白打接口；hook 仍挂面板层（非 SheetContent），关抽屉不丢进行中的流式对话。
// raised：后台传入，FAB 抬高避开表格分页条（分页右对齐在视口右下，bottom-6 会压住「下一页」）。
export function AiChatWidget({ raised = false }: { raised?: boolean }) {
  const mounted = useMounted();
  const { authenticated } = useAuth();

  if (!mounted || !authenticated) return null;
  return <AiChatPanel raised={raised} />;
}

function AiChatPanel({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const chat = useAiChat();
  // 当前模型是否支持图像理解（决定输入框是否出现「+」上传图片入口）。
  const vision =
    chat.models.find((m) => m.id === chat.modelId)?.vision ?? false;

  return (
    <>
      <Button
        onClick={() => {
          chat.init(); // 首次打开才拉 models/sessions
          setOpen(true);
        }}
        size="icon"
        className={cn(
          "fixed right-6 z-50 h-12 w-12 rounded-full shadow-lg",
          raised ? "bottom-20" : "bottom-6",
        )}
        aria-label="AI 助手"
      >
        <BotMessageSquare className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">AI 助手</SheetTitle>
          <AiChatHeader
            models={chat.models}
            modelId={chat.modelId}
            onModelChange={chat.setModelId}
            stream={chat.stream}
            onStreamChange={chat.setStream}
            onNewSession={() => {
              chat.newSession();
              setShowSessions(false);
            }}
            onToggleSessions={() => setShowSessions((s) => !s)}
            sessionsActive={showSessions}
          />
          {showSessions ? (
            <AiChatSessionList
              sessions={chat.sessions}
              activeId={chat.sessionId}
              onSelect={(sid) => {
                chat.selectSession(sid);
                setShowSessions(false);
              }}
              onRefresh={chat.refreshSessions}
            />
          ) : (
            <>
              <AiChatMessages
                messages={chat.messages}
                loading={chat.loadingMessages}
                streaming={chat.streaming}
                onRetry={chat.retry}
              />
              <AiChatInput
                streaming={chat.streaming}
                disabled={!chat.modelId || chat.loadingMessages}
                vision={vision}
                onSend={chat.send}
                onStop={chat.stop}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

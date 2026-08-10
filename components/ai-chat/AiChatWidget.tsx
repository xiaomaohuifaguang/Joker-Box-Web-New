"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useMounted } from "@/hooks/useMounted";
import { useAiChat } from "@/hooks/useAiChat";
import { AiChatHeader } from "./AiChatHeader";
import { AiChatMessages } from "./AiChatMessages";
import { AiChatInput } from "./AiChatInput";
import { AiChatSessionList } from "./AiChatSessionList";

// AI 会话助手：右下角悬浮钮 + 右侧抽屉。前后台各挂一份（共享本组件）。
// 仅登录后可见（接口需 token）；useMounted 防 hydration（token 是 client-only）。
// 面板拆成 AiChatPanel 内层组件：仅登录挂载——useAiChat 的首挂请求（models/sessions）才不会对未登录空跑。
export function AiChatWidget() {
  const mounted = useMounted();
  const { authenticated } = useAuth();

  if (!mounted || !authenticated) return null;
  return <AiChatPanel />;
}

function AiChatPanel() {
  const [open, setOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const chat = useAiChat();

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        aria-label="AI 助手"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetTitle className="sr-only">AI 助手</SheetTitle>
          <AiChatHeader
            models={chat.models}
            modelId={chat.modelId}
            onModelChange={chat.setModelId}
            onNewSession={() => {
              chat.newSession();
              setShowSessions(false);
            }}
            onToggleSessions={() => setShowSessions((s) => !s)}
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
              />
              <AiChatInput
                streaming={chat.streaming}
                disabled={!chat.modelId || chat.loadingMessages}
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

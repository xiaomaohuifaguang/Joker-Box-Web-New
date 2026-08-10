"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  chatStream,
  getChatMessages,
  getChatModels,
  getChatSessions,
} from "@/lib/api/aiChat";
import { ApiError } from "@/lib/api";
import type { ChatModel, ChatRole, ChatSession } from "@/types";

export interface UiMessage {
  key: string;
  role: ChatRole;
  content: string;
  reason: string;
  time: string | null;
  /** 流式中的 assistant 消息（未完成）。 */
  pending?: boolean;
}

// 后端 role 大写 -> 前端小写；空/未知归 assistant。
function normRole(role: string | null | undefined): ChatRole {
  const r = (role ?? "").toLowerCase();
  return r === "user" || r === "system" || r === "tool" ? r : "assistant";
}

// AI 会话状态机：模型/会话/消息/流式。sessionId=null 表示未建（首发 /chat 后端自动建）。
export function useAiChat() {
  const [models, setModels] = useState<ChatModel[]>([]);
  const [modelId, setModelId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  // 首挂：拉模型（默认选第一个）+ 会话列表。模型拉取失败提示（否则 send 被静默禁用）。
  useEffect(() => {
    let cancelled = false;
    getChatModels()
      .then((list) => {
        if (cancelled) return;
        setModels(list);
        setModelId((cur) => cur || list[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) toast.error("加载模型失败");
      });
    getChatSessions()
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSessions = useCallback(() => {
    getChatSessions().then(setSessions).catch(() => {});
  }, []);

  const selectSession = useCallback((sid: string) => {
    abortRef.current?.();
    setStreaming(false);
    setSessionId(sid);
    setLoadingMessages(true);
    getChatMessages(sid)
      .then((list) => {
        setMessages(
          list.map((m, i) => ({
            key: m.messageId || `m-${i}`,
            role: normRole(m.role),
            content: m.content ?? "",
            reason: m.reasonContent ?? "",
            time: m.createTime ?? null,
          })),
        );
      })
      .catch(() => toast.error("加载消息失败"))
      .finally(() => setLoadingMessages(false));
  }, []);

  const newSession = useCallback(() => {
    abortRef.current?.();
    setStreaming(false);
    setSessionId(null);
    setMessages([]);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setStreaming(false);
    // 把流式消息落为完成态（同时改掉 "streaming" 固定 key——否则下次 send 再插一条
    // key==="streaming"，onChunk 会同时往两条追加、onError 会误删这条已停的旧消息）。
    setMessages((ms) =>
      ms.map((m) =>
        m.pending ? { ...m, pending: false, key: `a-${Date.now()}` } : m,
      ),
    );
  }, []);

  const send = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text || streaming || !modelId) return;

      // 本地先插 user + 流式 assistant 占位。
      setMessages((ms) => [
        ...ms,
        {
          key: `u-${ms.length}`,
          role: "user",
          content: text,
          reason: "",
          time: null,
        },
        {
          key: "streaming",
          role: "assistant",
          content: "",
          reason: "",
          time: null,
          pending: true,
        },
      ]);
      setStreaming(true);

      const sidAtSend = sessionId;
      abortRef.current = chatStream(
        { modelId, sessionId: sidAtSend ?? undefined, content: text },
        {
          onChunk: (chunk) => {
            // 隐式建会话：首帧带回新 sessionId。
            if (!sidAtSend && chunk.sessionId) setSessionId(chunk.sessionId);
            setMessages((ms) =>
              ms.map((m) =>
                m.key === "streaming"
                  ? {
                      ...m,
                      content: m.content + (chunk.content ?? ""),
                      reason: m.reason + (chunk.reasonContent ?? ""),
                    }
                  : m,
              ),
            );
          },
          onDone: () => {
            abortRef.current = null;
            setStreaming(false);
            setMessages((ms) =>
              ms.map((m) =>
                m.key === "streaming"
                  ? { ...m, pending: false, key: `a-${Date.now()}` }
                  : m,
              ),
            );
            refreshSessions(); // 新会话/标题落库后刷新会话列表
          },
          onError: (err) => {
            abortRef.current = null;
            setStreaming(false);
            setMessages((ms) => ms.filter((m) => m.key !== "streaming"));
            toast.error(
              err instanceof ApiError ? err.message : err.message || "发送失败",
            );
          },
        },
      );
    },
    [modelId, sessionId, streaming, refreshSessions],
  );

  return {
    models,
    modelId,
    setModelId,
    sessions,
    sessionId,
    messages,
    streaming,
    loadingMessages,
    send,
    stop,
    newSession,
    selectSession,
    refreshSessions,
  };
}

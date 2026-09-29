"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  chatOnce,
  chatStream,
  getChatMessages,
  getChatModels,
  getChatSessions,
} from "@/lib/api/aiChat";
import { ApiError } from "@/lib/api";
import type { ChatFileInfo, ChatModel, ChatRole, ChatSession } from "@/types";

export interface UiMessage {
  key: string;
  role: ChatRole;
  content: string;
  reason: string;
  time: string | null;
  /** 附件（用户消息的图片，用于气泡内联缩略图）。 */
  files?: ChatFileInfo[];
  /** 请求失败原因（assistant 消息；与已生成的部分 content/reason 并存）。 */
  error?: string;
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
  // 流式/非流式偏好，localStorage 持久化（默认流式）。惰性初始化避免 effect 同步 setState；
  // window 仅在客户端（组件已 useMounted 守卫）访问。
  const [stream, setStreamState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("ai-chat-stream") !== "false";
  });
  const setStream = useCallback((v: boolean) => {
    setStreamState(v);
    try {
      localStorage.setItem("ai-chat-stream", String(v));
    } catch {
      // 隐私模式写失败忽略（保持当次会话内状态）。
    }
  }, []);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  // 最后一次发送的入参：失败卡片的「重试」按它原样重发。
  const lastRequestRef = useRef<{ content: string; files?: ChatFileInfo[] } | null>(null);

  // 懒加载：首挂不拉取，首次打开面板时由外部调 init()（initedRef 保证只拉一次）。
  // 拉模型（默认选第一个）+ 会话列表。模型拉取失败提示（否则 send 被静默禁用）。
  const initedRef = useRef(false);
  const init = useCallback(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    getChatModels()
      .then((list) => {
        setModels(list);
        setModelId((cur) => cur || list[0]?.id || "");
      })
      .catch(() => toast.error("加载模型失败"));
    getChatSessions()
      .then(setSessions)
      .catch(() => {});
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
            files: m.files ?? undefined,
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
    (content: string, files?: ChatFileInfo[]) => {
      const text = content.trim();
      if (!text || streaming || !modelId) return;
      // 附件只传 id（选中时已上传完成）；空数组不传字段。
      const fileIds = files?.length ? files.map((f) => f.id) : undefined;
      lastRequestRef.current = { content: text, files };

      // 本地先插 user + 流式 assistant 占位。
      setMessages((ms) => [
        ...ms,
        {
          key: `u-${ms.length}`,
          role: "user",
          content: text,
          reason: "",
          time: null,
          files,
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

      // 失败不落空：把占位的 assistant 消息落成「失败态」（保留流式已生成的部分内容），
      // 对话里永久可见（toast 几秒就消失，用户感知不到）；并保留 toast 做即时提醒。
      const failInto = (msg: string) => {
        setMessages((ms) =>
          ms.map((m) =>
            m.key === "streaming"
              ? { ...m, pending: false, key: `e-${Date.now()}`, error: msg }
              : m,
          ),
        );
        toast.error(msg);
      };

      // 非流式：一次性返回完整消息（chatOnce 走 api.post，自动 token/401/ApiError）。
      if (!stream) {
        chatOnce({
          modelId,
          sessionId: sidAtSend ?? undefined,
          content: text,
          fileIds,
        })
          .then((msg) => {
            if (!sidAtSend && msg.sessionId) setSessionId(msg.sessionId);
            setMessages((ms) =>
              ms.map((m) =>
                m.key === "streaming"
                  ? {
                      ...m,
                      pending: false,
                      key: msg.messageId || `a-${Date.now()}`,
                      content: msg.content ?? "",
                      reason: msg.reasonContent ?? "",
                      time: msg.createTime ?? null,
                    }
                  : m,
              ),
            );
            refreshSessions();
          })
          .catch((err) => {
            failInto(err instanceof ApiError ? err.message : "发送失败");
          })
          .finally(() => setStreaming(false));
        return;
      }

      abortRef.current = chatStream(
        {
          modelId,
          sessionId: sidAtSend ?? undefined,
          content: text,
          fileIds,
        },
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
            failInto(
              err instanceof ApiError ? err.message : err.message || "发送失败",
            );
          },
        },
      );
    },
    [modelId, sessionId, streaming, stream, refreshSessions],
  );

  // 重试最后一次发送（失败卡片的「重试」）：按记住的入参原样重发（新起一条 user 气泡）。
  const retry = useCallback(() => {
    const last = lastRequestRef.current;
    if (!last || streaming) return;
    send(last.content, last.files);
  }, [send, streaming]);

  return {
    init,
    models,
    modelId,
    setModelId,
    sessions,
    sessionId,
    messages,
    streaming,
    stream,
    setStream,
    loadingMessages,
    send,
    retry,
    stop,
    newSession,
    selectSession,
    refreshSessions,
  };
}

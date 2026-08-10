import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { streamSSE, type SSEMessage } from "@/lib/sse";
import type {
  ChatMessage,
  ChatModel,
  ChatRequestParam,
  ChatSession,
} from "@/types";

// AI 会话接口（/ai/completions/*）。非流式走 api（自动 token + ApiError）；
// 流式 /chat 走 streamSSE（fetch 读 body stream，手动带 token）。

const BASE = "/joker-box";

/** CHAT 模型列表：POST /ai/completions/models，无参。 */
export async function getChatModels(): Promise<ChatModel[]> {
  const { data } = await api.post<ChatModel[]>("/ai/completions/models");
  return data ?? [];
}

/** 会话列表：POST /ai/completions/sessions，无参（全量）。 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const { data } = await api.post<ChatSession[]>("/ai/completions/sessions");
  return data ?? [];
}

/** 会话消息：POST /ai/completions/messages，query 传 sessionId（全量）。 */
export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const { data } = await api.post<ChatMessage[]>("/ai/completions/messages", {
    params: { sessionId },
  });
  return data ?? [];
}

/** 非流式聊天：POST /ai/completions/chat（stream=false），返回完整 ChatMessage。 */
export async function chatOnce(
  param: Omit<ChatRequestParam, "stream">,
): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>("/ai/completions/chat", {
    body: { ...param, stream: false },
  });
  return data;
}

export interface ChatStreamHandlers {
  /** 每个增量帧（已 JSON.parse 的 HttpResult<ChatMessage>，data 为增量片段）。 */
  onChunk: (chunk: Partial<ChatMessage>) => void;
  /** 结束帧 [DONE] 或流自然结束时回调（拿到最终 sessionId 用）。 */
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * 流式聊天：POST /ai/completions/chat（stream=true），SSE 增量。
 * 每帧解析 HttpResult<ChatMessage>；data.data === "[DONE]" 判结束。
 * 返回 abort 函数（停止生成）。
 */
export function chatStream(
  param: Omit<ChatRequestParam, "stream">,
  handlers: ChatStreamHandlers,
): () => void {
  return streamSSE(
    `${BASE}/ai/completions/chat`,
    { ...param, stream: true },
    {
      onMessage: (msg: SSEMessage) => {
        try {
          const frame = JSON.parse(msg.data) as {
            code: number;
            data: Partial<ChatMessage> | string;
          };
          if (frame.data === "[DONE]") {
            handlers.onDone();
            return;
          }
          if (frame.code !== 200) {
            handlers.onError(new Error(`业务错误: ${frame.code}`));
            return;
          }
          handlers.onChunk(frame.data as Partial<ChatMessage>);
        } catch {
          // 单帧解析失败跳过（容错，不中断整流）。
        }
      },
      onError: handlers.onError,
      onDone: handlers.onDone,
    },
    getToken(),
  );
}

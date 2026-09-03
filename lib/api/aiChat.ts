import { api, ApiError, buildQuery, handleUnauthorized } from "@/lib/api";
import { apiFetch, saveBlob } from "@/lib/api/fetch";
import { getToken } from "@/lib/auth";
import { env } from "@/lib/env";
import { streamSSE, type SSEMessage } from "@/lib/sse";
import type {
  ChatFileInfo,
  ChatMessage,
  ChatModel,
  ChatRequestParam,
  ChatSession,
} from "@/types";

// AI 会话接口（/ai/completions/*）。非流式走 api（自动 token + ApiError）；
// 流式 /chat 走 streamSSE（lib/sse.ts，读 body stream，手动带 token）；
// fileUpload/fileDownload 同 file.ts：走 apiFetch（multipart / blob+token），不经 api.*。

const BASE = env.apiBase;

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
  // [DONE] 帧与流自然结束都会触发 onDone——去重，避免重复收尾（如重复刷新会话列表）。
  let doneFired = false;
  const fireDone = () => {
    if (doneFired) return;
    doneFired = true;
    handlers.onDone();
  };
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
            fireDone();
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
      onDone: fireDone,
    },
    getToken(),
  );
}

// ─── 附件（图片上传/下载）─────────────────────────────────────────────
// 同 lib/api/file.ts 的理由不走 api.*：upload 是 multipart（api.post 会设 JSON
// Content-Type 破坏 boundary），download 是二进制流（api.* 按 JSON 解析）。

/** 聊天图片上传：POST /ai/completions/fileUpload，multipart（uploadFile）。 */
export async function uploadChatFile(file: File): Promise<ChatFileInfo> {
  const fd = new FormData();
  fd.append("uploadFile", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await apiFetch(`${BASE}/ai/completions/fileUpload`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, `上传失败: ${res.status}`);
  const body = (await res.json()) as {
    code: number;
    msg?: string;
    data?: ChatFileInfo;
  };
  handleUnauthorized(body.code, !!token);
  if (body.code !== 200 || !body.data)
    throw new ApiError(body.code, body.msg || `上传失败: ${body.code}`);
  return body.data;
}

/**
 * 取聊天附件内容：GET /ai/completions/fileDownload?fileId=（带 token）→ Blob。
 * 缩略图（objectURL）与触发下载共用——<img> 直链发不了 Authorization 头，只能 fetch。
 */
async function fetchChatFileBlob(fileId: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = `${BASE}/ai/completions/fileDownload${buildQuery({ fileId })}`;
  const res = await apiFetch(url, { headers });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || contentType.includes("application/json")) {
    // 错误响应（JSON）
    let msg = `获取文件失败: ${res.status}`;
    try {
      const body = await res.json();
      msg = body.msg || msg;
      handleUnauthorized(body.code ?? res.status, !!token);
    } catch {
      handleUnauthorized(res.status, !!token);
    }
    throw new ApiError(res.status, msg);
  }
  return res.blob();
}

/** 聊天附件 → objectURL（消息气泡内联缩略图用；调用方负责 revoke）。 */
export async function getChatFileObjectUrl(fileId: string): Promise<string> {
  const blob = await fetchChatFileBlob(fileId);
  return URL.createObjectURL(blob);
}

/** 聊天附件下载：web 触发浏览器下载，Tauri 弹系统保存框（文件名取自 messages 的 filename）。 */
export async function downloadChatFile(
  fileId: string,
  filename: string,
): Promise<void> {
  const blob = await fetchChatFileBlob(fileId);
  await saveBlob(blob, filename);
}

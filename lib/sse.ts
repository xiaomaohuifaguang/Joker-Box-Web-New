// fetch + ReadableStream 解析 SSE 的工具（项目唯一流式点，不走 lib/api/client.ts）。
// 帧格式：若干 "data: <一行JSON>\n\n"，以空行分帧。

import { apiFetch } from "@/lib/api/fetch";

export interface SSEMessage {
  /** data: 后面的整行文本（一个 JSON 串）。 */
  data: string;
}

/**
 * 流式读取 SSE。手动带 token。
 * onMessage 每帧回调（data 为整行 JSON 文本）；onError 网络/解析错误；onDone 流自然结束。
 * 返回 abort 函数用于中途取消。
 */
export function streamSSE(
  url: string,
  body: unknown,
  handlers: {
    onMessage: (msg: SSEMessage) => void;
    onError?: (err: Error) => void;
    onDone?: () => void;
  },
  token: string | null,
): () => void {
  const controller = new AbortController();
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  (async () => {
    try {
      const res = await apiFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        handlers.onError?.(new Error(`请求失败: ${res.status}`));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 以空行分帧（\n\n；兼容 \r\n\r\n）。
        let idx: number;
        while ((idx = buffer.search(/\r?\n\r?\n/)) >= 0) {
          const rawFrame = buffer.slice(0, idx);
          buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, "");
          for (const line of rawFrame.split(/\r?\n/)) {
            if (line.startsWith("data:")) {
              handlers.onMessage({ data: line.slice(5).trimStart() });
            }
          }
        }
      }
      handlers.onDone?.();
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // 主动取消，不算错误
      handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => controller.abort();
}

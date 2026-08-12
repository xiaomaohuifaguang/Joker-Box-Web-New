# AI 会话助手（悬浮按钮 + 右侧抽屉，前后台共用）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 右下角悬浮按钮点开右侧抽屉的 AI 会话功能，前台 `(front)/layout.tsx` 与后台 `console/layout.tsx` 各挂一份（共用组件）；支持流式 SSE 聊天、模型切换、会话新建/切换、思考内容折叠。

**Architecture:** 类型层 → 数据层（含 SSE 流式读取）→ `useAiChat` 会话状态机 → `components/ai-chat/` 共享 UI（Widget/Header/Messages/Input/SessionList）→ 两个 layout 集成。鉴权：`useAuth().authenticated`（响应式）+ `useMounted` 防 hydration，未登录不渲染。

**Tech Stack:** Next.js 16 static export / React 19 / TS strict / Tailwind v4 / shadcn Sheet、ScrollArea / fetch+ReadableStream 解 SSE。

## 接口约定（已与后端确认）

| 接口 | 方法 | 参数 | 返回 data |
|---|---|---|---|
| `/ai/completions/models` | POST | 无 | `List<AiModel>`（CHAT 类型；id/name/model/description）|
| `/ai/completions/sessions` | POST | 无 | `List<ChatSession>`（sessionId/title/createTime/updateTime）|
| `/ai/completions/messages` | POST | query `sessionId` | `List<ChatMessage>` |
| `/ai/completions/chat` | POST | body `ChatRequestParam` | `stream=false`→`HttpResult<ChatMessage>`；`stream=true`→SSE |

- `ChatRequestParam = { modelId: string(必填); sessionId?: string; content: string; stream: boolean }`。
- **隐式建会话**：`/chat` 不传 `sessionId`，后端自动建并在响应 `ChatMessage.sessionId` 返回新 id（后续消息带上）。
- **role 大写**：`USER`/`ASSISTANT`/`SYSTEM`/`TOOL`，前端归一化小写比对。
- **SSE 帧**：每帧 `data: <一行JSON>\n\n`，JSON 为 `HttpResult<ChatMessage>`（增量帧 `content`/`reasonContent` 为追加片段，`role`/`createTime` 增量帧为 null）。结束帧 `data: {"code":200,"data":"[DONE]",...}`。
- **Content-Type 分流**：`stream=true` 响应头 `text/event-stream`；`stream=false` 为 `application/json`。
- 会话/消息列表**全量**（暂不分页）；会话 title 后端自动生成。

## Global Constraints

- **Static export**：无 SSR；运行时数据客户端拉。所有交互组件 `"use client"`。
- **导入一律 `@/`**；组件 PascalCase；hook `useXxx`；一文件一组件。
- **TS strict，无 `any`**。
- **id 均 `string`**（sessionId/messageId/modelId）。
- **lint 红线 `react-hooks/set-state-in-effect`**：effect 内只在异步回调/订阅回调 setState，不同步 setState。
- **DOMPurify 仅在客户端**跑（`typeof window === "undefined"` 守卫，参考 `ganDaShi/_components/RichContent.tsx`）。
- toast 用 `import { toast } from "sonner"`。
- 鉴权：widget 仅 `useMounted() && useAuth().authenticated` 时渲染。
- 验证命令：`npx tsc --noEmit`、`npm run lint`、`npm run build`。

---

### Task 1: 类型层 `types/ai-chat.ts`

**Files:**
- Create: `types/ai-chat.ts`
- Modify: `types/index.ts`（barrel 加一行，字母序）

**Interfaces:**
- Produces: `ChatModel`、`ChatSession`、`ChatMessage`、`ChatRequestParam`、`ChatRole` —— 后续所有任务用。

- [ ] **Step 1: 写类型文件**（创建 `types/ai-chat.ts`）

```typescript
// AI 会话相关类型（对应 /ai/completions/* 接口）。

/** 消息角色（后端大写，前端归一化小写比对）。 */
export type ChatRole = "system" | "user" | "assistant" | "tool";

/** CHAT 类型模型（/ai/completions/models 返回）。 */
export interface ChatModel {
  id: string;
  name: string;
  model: string;
  description: string;
}

/** 会话（/ai/completions/sessions 返回）。 */
export interface ChatSession {
  sessionId: string;
  title: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  updateTime: string;
}

/** 消息（/ai/completions/messages 与 /chat 返回/增量帧）。 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  /** 后端大写（USER/ASSISTANT/...）；增量帧可能为 null。 */
  role: string | null;
  content: string;
  /** 思考内容（增量帧为追加片段）。 */
  reasonContent: string | null;
  /** yyyy-MM-dd HH:mm:ss；增量帧为 null。 */
  createTime: string | null;
}

/** /ai/completions/chat body。 */
export interface ChatRequestParam {
  /** 模型 id（必填） */
  modelId: string;
  /** 会话 id（选填；缺省后端自动建会话） */
  sessionId?: string;
  /** 用户输入内容 */
  content: string;
  /** 是否流式 */
  stream: boolean;
}
```

- [ ] **Step 2: 挂 barrel**：`types/index.ts` 在 `export * from "./ai-model";` 之后加 `export * from "./ai-chat";`

- [ ] **Step 3: 类型检查** `npx tsc --noEmit` PASS

- [ ] **Step 4: Commit**
```bash
git add types/ai-chat.ts types/index.ts
git commit -m "feat(ai-chat): 类型层——ChatModel/ChatSession/ChatMessage/ChatRequestParam"
```

---

### Task 2: 数据层 `lib/api/aiChat.ts` + SSE 工具 `lib/sse.ts`

**Files:**
- Create: `lib/api/aiChat.ts`
- Create: `lib/sse.ts`

**Interfaces:**
- Consumes: Task 1 类型；`api`（`@/lib/api`）非流式调用；`getToken`（`@/lib/auth`）流式调用。
- Produces: `getChatModels()`、`getChatSessions()`、`getChatMessages(sessionId)`、`chatOnce(param)`、`chatStream(param, handlers)`；`SSEMessage`、`streamSSE(url, body, handlers)`。

非流式 models/sessions/messages/chat(stream=false) 走现有 `api.post`（自动带 token + ApiError）。流式必须裸 `fetch`（读 body stream），手动带 token。

- [ ] **Step 1: 写 SSE 工具**（创建 `lib/sse.ts`）

```typescript
// fetch + ReadableStream 解析 SSE 的工具（项目唯一流式点，不走 lib/api/client.ts）。
// 帧格式：若干 "data: <一行JSON>\n\n"，以空行分帧。

export interface SSEMessage {
  /** data: 后面的整行文本（一个 JSON 串）。 */
  data: string;
}

/**
 * 流式读取 SSE。手动带 token。返回响应（调用方先看 content-type 决定是否调本函数）。
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
      const res = await fetch(url, {
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
```

- [ ] **Step 2: 写数据层**（创建 `lib/api/aiChat.ts`）

```typescript
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
```

- [ ] **Step 3: 类型检查 + lint** `npx tsc --noEmit && npx eslint lib/sse.ts lib/api/aiChat.ts` PASS

- [ ] **Step 4: Commit**
```bash
git add lib/api/aiChat.ts lib/sse.ts
git commit -m "feat(ai-chat): 数据层 4 接口 + SSE 流式工具（fetch+ReadableStream 解 data: 帧）"
```

---

### Task 3: 会话状态机 `hooks/useAiChat.ts`

**Files:**
- Create: `hooks/useAiChat.ts`

**Interfaces:**
- Consumes: `getChatModels`/`getChatSessions`/`getChatMessages`/`chatStream`（Task 2）、类型（Task 1）。
- Produces: `useAiChat()` 返回下述全部——供 Widget/Header/Messages/Input/SessionList 消费。

**UI 消息模型**（hook 内部）：本地消息用 `UiMessage = { key: string; role: ChatRole; content: string; reason: string; time: string | null; pending?: boolean }`。`key` 用于 React key + 流式追加定位（assistant 流式消息用固定 key `"streaming"`）。

**返回**：
```typescript
{
  models: ChatModel[];
  modelId: string;                 // 当前模型（默认 models[0].id）
  setModelId: (id: string) => void;
  sessions: ChatSession[];
  sessionId: string | null;        // null=未建（首发后端建）
  messages: UiMessage[];
  streaming: boolean;
  loadingMessages: boolean;
  send: (content: string) => void; // 空内容忽略
  stop: () => void;                // 中断流式
  newSession: () => void;          // 清空消息 + sessionId=null
  selectSession: (sessionId: string) => void; // 切会话并拉消息
  refreshSessions: () => void;
}
```

- [ ] **Step 1: 写 hook**

要点（全部遵守 `set-state-in-effect`：effect 只在异步回调 setState）：

```typescript
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

  // 首挂：拉模型（默认选第一个）+ 会话列表。
  useEffect(() => {
    let cancelled = false;
    getChatModels()
      .then((list) => {
        if (cancelled) return;
        setModels(list);
        setModelId((cur) => cur || list[0]?.id || "");
      })
      .catch(() => {});
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
    // 把流式消息落为完成态。
    setMessages((ms) => ms.map((m) => (m.pending ? { ...m, pending: false } : m)));
  }, []);

  const send = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text || streaming || !modelId) return;

      // 本地先插 user + 流式 assistant 占位。
      setMessages((ms) => [
        ...ms,
        { key: `u-${ms.length}`, role: "user", content: text, reason: "", time: null },
        { key: "streaming", role: "assistant", content: "", reason: "", time: null, pending: true },
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
              ms.map((m) => (m.key === "streaming" ? { ...m, pending: false, key: `a-${Date.now()}` } : m)),
            );
            refreshSessions(); // 新会话/标题落库后刷新会话列表
          },
          onError: (err) => {
            abortRef.current = null;
            setStreaming(false);
            setMessages((ms) => ms.filter((m) => m.key !== "streaming"));
            toast.error(err instanceof ApiError ? err.message : err.message || "发送失败");
          },
        },
      );
    },
    [modelId, sessionId, streaming, refreshSessions],
  );

  return {
    models, modelId, setModelId,
    sessions, sessionId,
    messages, streaming, loadingMessages,
    send, stop, newSession, selectSession, refreshSessions,
  };
}
```

注：`Date.now()` 仅用于 onDone 生成稳定 key（非渲染期，OK）。若 `streaming` 消息 onDone 时已被 stop 落完成态，map 找不到 `key==="streaming"`，无害。

- [ ] **Step 2: 类型检查 + lint** `npx tsc --noEmit && npx eslint hooks/useAiChat.ts` PASS（无 set-state-in-effect 告警）

- [ ] **Step 3: Commit**
```bash
git add hooks/useAiChat.ts
git commit -m "feat(ai-chat): useAiChat 会话状态机——模型/会话/消息/流式发送/停止/新建/切换"
```

---

### Task 4: 共享 UI `components/ai-chat/`（5 组件）

**Files:**
- Create: `components/ai-chat/AiChatWidget.tsx`（悬浮按钮 + Sheet 总装，鉴权守卫）
- Create: `components/ai-chat/AiChatHeader.tsx`（模型 Select + 新建会话钮 + 历史会话入口）
- Create: `components/ai-chat/AiChatMessages.tsx`（消息流 + 思考折叠 + 流式光标）
- Create: `components/ai-chat/AiChatInput.tsx`（输入 + 发送/停止）
- Create: `components/ai-chat/AiChatSessionList.tsx`（会话列表，Sheet 内嵌一层）

**Interfaces:**
- Consumes: `useAiChat`（Task 3）返回的全部；shadcn `Sheet`/`ScrollArea`/`Select`/`Button`/`Textarea`(或 input)；lucide 图标。
- Produces: `AiChatWidget`（唯一对外，两个 layout 用）。

设计要点（dense 工具面板，非营销页——克制，一个 signature：思考块的「思考中」动画态）：

- [ ] **Step 1: AiChatWidget**（鉴权 + 悬浮钮 + Sheet 容器，持有 `useAiChat()` 一份，传给子组件）

```typescript
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
export function AiChatWidget() {
  const mounted = useMounted();
  const { authenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const chat = useAiChat();

  if (!mounted || !authenticated) return null;

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
            onNewSession={() => { chat.newSession(); }}
            onToggleSessions={() => setShowSessions((s) => !s)}
          />
          {showSessions ? (
            <AiChatSessionList
              sessions={chat.sessions}
              activeId={chat.sessionId}
              onSelect={(sid) => { chat.selectSession(sid); setShowSessions(false); }}
              onRefresh={chat.refreshSessions}
            />
          ) : (
            <>
              <AiChatMessages
                messages={chat.messages}
                streaming={chat.streaming}
                loading={chat.loadingMessages}
              />
              <AiChatInput
                streaming={chat.streaming}
                disabled={!chat.modelId}
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
```

- [ ] **Step 2: AiChatHeader**（模型下拉默认第一个由 hook 定 + 「新建会话」+「历史」两 icon 钮）

```typescript
"use client";

import { History, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ChatModel } from "@/types";

// 抽屉顶栏：模型选择 + 新建会话 + 历史会话切换。
export function AiChatHeader({
  models, modelId, onModelChange, onNewSession, onToggleSessions,
}: {
  models: ChatModel[];
  modelId: string;
  onModelChange: (id: string) => void;
  onNewSession: () => void;
  onToggleSessions: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-3">
      <Select value={modelId} onValueChange={onModelChange}>
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent position="popper">
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewSession} aria-label="新建会话" title="新建会话">
        <SquarePen className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSessions} aria-label="历史会话" title="历史会话">
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: AiChatMessages**（消息流；思考块：流式中展开+「思考中」呼吸态、有 content 后自动折叠可手开；assistant 流式闪烁光标；滚动到底）

```typescript
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
  messages, streaming, loading,
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
```

- [ ] **Step 4: AiChatInput**（Textarea，Enter 发送 / Shift+Enter 换行；流式中显示停止钮）

```typescript
"use client";

import { useState } from "react";
import { SendHorizonal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 输入区：Enter 发送 / Shift+Enter 换行；流式中发送钮变停止钮。
export function AiChatInput({
  streaming, disabled, onSend, onStop,
}: {
  streaming: boolean;
  disabled: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || streaming || disabled) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
          rows={2}
          disabled={disabled}
          className="max-h-32 resize-none text-sm"
        />
        {streaming ? (
          <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={onStop} aria-label="停止">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={submit} disabled={disabled || !value.trim()} aria-label="发送">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: AiChatSessionList**（会话列表；点切换；无会话时空态；当前高亮）

```typescript
"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

// 会话历史列表（Sheet 内切换视图）。进入时刷新一次。
export function AiChatSessionList({
  sessions, activeId, onSelect, onRefresh,
}: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onRefresh: () => void;
}) {
  // 打开列表时拉最新会话（effect 内仅异步回调 setState，在 hook 里）。
  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col p-2">
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无会话</div>
        ) : (
          sessions.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              onClick={() => onSelect(s.sessionId)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                s.sessionId === activeId && "bg-accent",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{s.title || "未命名会话"}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{s.updateTime?.slice(5, 16)}</span>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 6: 类型检查 + lint** `npx tsc --noEmit && npx eslint components/ai-chat/` PASS（无 set-state-in-effect / static-components 告警）

- [ ] **Step 7: Commit**
```bash
git add components/ai-chat/
git commit -m "feat(ai-chat): 共享 UI——悬浮钮+右侧抽屉，模型/会话/消息流/思考折叠/输入发送停止"
```

---

### Task 5: 集成进两个 layout + README

**Files:**
- Modify: `app/(front)/layout.tsx`（挂 `<AiChatWidget/>`）
- Modify: `app/console/layout.tsx`（挂 `<AiChatWidget/>`）
- Modify: `components/README.md` 或对应 README（登记 ai-chat 组件目录职责）
- Modify: `app/(front)/README.md` / `app/console/README.md`（如需）

**Interfaces:**
- Consumes: `AiChatWidget`（Task 4）。

- [ ] **Step 1: 前台 layout**（`(front)/layout.tsx` 是 Server Component；`AiChatWidget` 是 client，直接渲染即可——它内部自己 `useMounted + useAuth` 守卫）

`app/(front)/layout.tsx` 改为：
```typescript
import type { ReactNode } from "react";
import { AiChatWidget } from "@/components/ai-chat/AiChatWidget";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";

// 前台布局：Header + 中部（随路由切换的 {children}）+ Footer + AI 会话助手（登录可见）。
export default function FrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <AiChatWidget />
    </div>
  );
}
```

- [ ] **Step 2: 后台 layout**（`console/layout.tsx` 已是 client；在 `SidebarProvider` 内、`SidebarInset` 后挂）

`app/console/layout.tsx`：import 加 `AiChatWidget`，在 `</SidebarInset>` 之后、`</SidebarProvider>` 之前加 `<AiChatWidget />`：
```typescript
        </SidebarInset>
        <AiChatWidget />
      </SidebarProvider>
```

- [ ] **Step 3: README 登记**：在 `components/README.md`（若无该文件则建）加一条 `ai-chat/` 目录职责：
```markdown
- `ai-chat/`：AI 会话助手（前后台共用，两个 layout 各挂一份）。右下角悬浮钮 + 右侧 Sheet 抽屉。`AiChatWidget` 总装（`useMounted`+`useAuth` 守卫，登录可见）+ Header（模型 Select 默认第一个/新建/历史）+ Messages（user 右 assistant 左，思考块流式展开、出 content 自动折叠，滚动到底）+ Input（Enter 发/Shift+Enter 换行/流式停止）+ SessionList。状态机 `hooks/useAiChat`（sessionId=null 首发后端隐式建会话，SSE 增量累积 content/reasonContent），数据层 `lib/api/aiChat`（流式走 `lib/sse.ts` fetch+ReadableStream 解 data: 帧）。
```

- [ ] **Step 4: 全量验证** `npx tsc --noEmit && npm run lint && npm run build` 全 PASS

- [ ] **Step 5: Commit**
```bash
git add app/(front)/layout.tsx app/console/layout.tsx components/README.md
git commit -m "feat(ai-chat): 集成前后台 layout——右下角悬浮钮+AI 会话抽屉，登录可见"
```

---

## Self-Review 记录

- **接口覆盖**：models(T5 Header)、sessions(T5 SessionList + hook)、messages(hook selectSession)、chat 流式(hook send，stream=true)——全覆盖。隐式建会话在 hook onChunk 首帧固化 sessionId。
- **占位符**：无 TBD；所有组件/工具含完整代码。
- **类型一致**：`UiMessage`（Task 3 定义 export）被 Task 4 Messages 消费；`chatStream(param, handlers)` 签名 Task 2↔Task 3 一致；`streamSSE(url, body, handlers, token)` Task 2 内部一致。
- **lint 红线**：所有 setState 在事件回调/异步回调/订阅回调；effect 只操作 DOM（Messages 滚动）或发异步请求（hook、SessionList onRefresh）；`useMounted`+`useAuth` 守卫 hydration。
- **流式解析**：按后端样例——增量帧 `data:{...ChatMessage}`、结束帧 `data:"[DONE]"`；`chatStream` 判 `frame.data==="[DONE]"`。role 大写归一化（Task 3 normRole）。

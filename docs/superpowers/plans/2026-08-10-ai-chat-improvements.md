# AI 会话助手三项改进（头部布局 / Markdown 渲染 / 流式切换）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修 AI 会话抽屉三处：① 头部历史/新建图标与 Sheet 关闭 X 重叠；② assistant 消息改 Markdown 渲染；③ 头部加流式/非流式切换（持久化），非流式走一次性接口。

**Architecture:** 全部在既有 `components/ai-chat/` 与 `hooks/useAiChat.ts` 上增量改。Markdown 用 `react-markdown + remark-gfm`（输出 React 树、天然 XSS 安全，不走 dangerouslySetInnerHTML），经 `next/dynamic`(`ssr:false`) 懒加载避免进首屏 bundle；套 `@tailwindcss/typography` 的 `prose`（项目已装，ganDaShi 同款主题）。流式切换在 `useAiChat` 加 `stream` 状态（localStorage 持久化），`send()` 按 `stream` 分流：true 走既有 `chatStream`(SSE)，false 走已存在但未用的 `chatOnce`。

**Tech Stack:** Next.js 16 static export / React 19 / TS strict / Tailwind v4 / shadcn Switch+Select / react-markdown + remark-gfm + @tailwindcss/typography(prose)。

## 接口约定（既有，不变）

- `POST /ai/completions/chat` body `ChatRequestParam{modelId, sessionId?, content, stream}`：`stream=true`→SSE 增量帧；`stream=false`→`HttpResult<ChatMessage>` 一次性返回完整消息（`chatOnce` 已封装，当前无人用）。
- 非流式 `chatOnce` 走 `api.post`（自动带 token + ApiError + 401 处理），返回 `data` 为完整 `ChatMessage`（含 `sessionId`/`content`/`reasonContent`/`createTime`）。
- 隐式建会话：两种模式都不传 `sessionId`，后端在响应里带回新 `sessionId`。

## Global Constraints

- **Static export**（`output:'export'`）：无 SSR；运行时数据客户端拉。所有交互组件 `"use client"`。
- **导入一律 `@/`**；组件 PascalCase；hook `useXxx`；一文件一组件。
- **TS strict，无 `any`**。
- **lint 红线 `react-hooks/set-state-in-effect`**：effect 内只在异步回调 setState，不同步 setState；初始值从 localStorage 读用 `useState(() => …)` 惰性初始化（非 effect）。
- **`next/dynamic` 的 `ssr:false` 只能写在 Client Component 内**（Server Component 会报错）——本计划涉及文件全是 client。
- **主题 token**：全部用 `--brand`/`bg-muted`/`text-muted-foreground` 等 token + `prose` 修饰符，禁写死颜色（5 套预设 × 明暗自动跟随）。
- toast 用 `import { toast } from "sonner"`。
- 验证命令：`npx tsc --noEmit`、`npm run lint`、`npm run build`。
- **lint 告警清零**：改完的目标文件 `npx eslint <file>` 须 0 error 0 warning。

---

### Task 1: 头部布局修复（关闭 X 不与图标重叠）

**Files:**
- Modify: `components/ai-chat/AiChatHeader.tsx:21`

**Interfaces:**
- Consumes: 无（纯样式）。
- Produces: 无（对外签名不变）。

背景：`SheetContent` 内置的关闭 X 用 `absolute top-4 right-4` 定位（见 `components/ui/sheet.tsx:78`），`AiChatHeader` 根 flex 容器是 `px-4 py-3`，历史/新建图标会顶到右上角与 X 重叠。修法：给头部右侧预留出 X 的空间（`px-4` → `pl-4 pr-12`），不动 Sheet 共享组件。

- [ ] **Step 1: 改容器 padding**

`components/ai-chat/AiChatHeader.tsx` 第 21 行：
```tsx
    <div className="flex items-center gap-2 border-b px-4 py-3">
```
改为：
```tsx
    <div className="flex items-center gap-2 border-b py-3 pl-4 pr-12">
```

- [ ] **Step 2: 验证** `npx eslint components/ai-chat/AiChatHeader.tsx` PASS

- [ ] **Step 3: Commit**
```bash
git add components/ai-chat/AiChatHeader.tsx
git commit -m "fix(ai-chat): 头部右 padding 让出 Sheet 关闭 X 区域，消除与历史/新建图标重叠"
```

---

### Task 2: Markdown 渲染（`AiMarkdown` 组件 + assistant 消息接入）

**Files:**
- Create: `components/ai-chat/MarkdownRenderer.tsx`（react-markdown 直接封装，纯 client）
- Create: `components/ai-chat/AiMarkdown.tsx`（对外出口：`next/dynamic(ssr:false)` 懒加载 + 纯文本兜底）
- Modify: `components/ai-chat/AiChatMessages.tsx`（assistant content 用 AiMarkdown 渲染）
- Modify: `package.json`（新增依赖，经 `npm install`）

**Interfaces:**
- Consumes: `react-markdown`、`remark-gfm`（新装）；`cn`（`@/lib/utils`）。
- Produces: `AiMarkdown({ content, className? })` —— Task 后续/后续模块复用的 Markdown 渲染器。

设计要点：react-markdown 输出 React 元素树（非原始 HTML），**天然 XSS 安全**，无需 DOMPurify/`dangerouslySetInnerHTML`。`react-markdown` 体积 ~45KB gz，只在抽屉打开渲染消息时才需要，故用 `next/dynamic` 懒加载、加载期回退纯文本（避免阻塞/闪烁）。`ssr:false` 写在 client 组件 `AiMarkdown.tsx` 内（符合 Next 16 约束）。样式套 `prose dark:prose-invert`（项目 `@custom-variant dark` 已让 `dark:` 跟 `.dark` 走）+ prose 修饰符让代码块/inline code 用主题 token。

- [ ] **Step 1: 装依赖**
```bash
npm install react-markdown remark-gfm
```

- [ ] **Step 2: 写 MarkdownRenderer.tsx**（react-markdown 直接封装）

```tsx
"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// react-markdown 直接渲染（输出 React 树，XSS 安全）。仅供 AiMarkdown 懒加载封装内部用。
export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        // 代码块/inline code 用主题 token；去 prose 给 code 加的引号。
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border/60",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        // 段落/列表间距收紧，聊天气泡里更紧凑。
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2",
        "prose-a:text-brand prose-a:underline",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
```

- [ ] **Step 3: 写 AiMarkdown.tsx**（懒加载出口 + 兜底）

```tsx
"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// 懒加载 react-markdown（~45KB，仅打开抽屉渲染消息时才下载），加载期回退纯文本。
// ssr:false 只能写在 client 组件内（本文件即 client）。静态导出下无 SSR，此选项只为
// 强制客户端 code-split，避免 markdown 进首屏 bundle。
const MarkdownRenderer = dynamic(
  () =>
    import("./MarkdownRenderer").then((m) => ({ default: m.MarkdownRenderer })),
  { ssr: false },
);

// Markdown 渲染出口：content 为 assistant 消息的 markdown 文本。
export function AiMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;
  return <MarkdownRenderer content={content} className={cn("text-sm", className)} />;
}
```

> 说明：`next/dynamic` 的 `loading` 兜底这里省略——`ssr:false` + 静态导出下，组件挂载即开始拉 chunk，首帧短暂空档由外层消息的 `pending` 光标/加载态覆盖；若需要显式 loading 文案，可给 `dynamic(..., { ssr:false, loading: () => <div className="whitespace-pre-wrap text-sm">{content}</div> })`，但 content 在闭包里需在 dynamic 外定义组件，会触发 `react-hooks/static-components`——故保持无 loading，靠外层 pending 态。

- [ ] **Step 4: assistant 消息接入 AiMarkdown**

`components/ai-chat/AiChatMessages.tsx`：
1. 顶部 import 加：
```tsx
import { AiMarkdown } from "./AiMarkdown";
```
2. content 渲染块（当前为）：
```tsx
              {m.content && (
                <div className="whitespace-pre-wrap break-words">
                  {m.content}
                  {m.pending && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />}
                </div>
              )}
```
改为按角色分流——user 保持纯文本，assistant 用 Markdown：
```tsx
              {m.content &&
                (m.role === "assistant" ? (
                  <div className="relative">
                    <AiMarkdown content={m.content} />
                    {m.pending && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                ))}
```

- [ ] **Step 5: 验证** `npx tsc --noEmit && npx eslint components/ai-chat/` PASS（无 set-state-in-effect / static-components 告警）

- [ ] **Step 6: Commit**
```bash
git add package.json package-lock.json components/ai-chat/MarkdownRenderer.tsx components/ai-chat/AiMarkdown.tsx components/ai-chat/AiChatMessages.tsx
git commit -m "feat(ai-chat): assistant 消息 Markdown 渲染——react-markdown+gfm 懒加载，prose 主题排版"
```

---

### Task 3: 流式/非流式切换（`useAiChat` 加 `stream` + `send` 分流 + 头部 Switch）

**Files:**
- Modify: `hooks/useAiChat.ts`（加 `stream`/`setStream` 持久化状态 + `send` 分流）
- Modify: `components/ai-chat/AiChatHeader.tsx`（加流式 Switch）
- Modify: `components/ai-chat/AiChatWidget.tsx`（把 stream 传给 Header）

**Interfaces:**
- Consumes: `chatOnce`（`@/lib/api/aiChat`，既有未用）；`Switch`（`@/components/ui/switch`，既有）。
- Produces: `useAiChat()` 返回值新增 `stream: boolean`、`setStream: (v: boolean) => void`（在既有 13 键基础上 +2）。

- [ ] **Step 1: `useAiChat` 加 stream 状态（localStorage 持久化，惰性初始化）**

`hooks/useAiChat.ts`：
1. import 加 `chatOnce`：
```tsx
import {
  chatOnce,
  chatStream,
  getChatMessages,
  getChatModels,
  getChatSessions,
} from "@/lib/api/aiChat";
```
2. `streaming` state 声明附近（约 37 行后）加 stream 偏好：
```tsx
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
```

- [ ] **Step 2: `send()` 按 stream 分流**

`hooks/useAiChat.ts` 的 `send` 内，在 `setStreaming(true);` 之后、`const sidAtSend = sessionId;` 之前插入非流式分支（非流式直接走 `chatOnce` 并 `return`）：

现有：
```tsx
      setStreaming(true);

      const sidAtSend = sessionId;
      abortRef.current = chatStream(
```
改为：
```tsx
      setStreaming(true);

      const sidAtSend = sessionId;

      // 非流式：一次性返回完整消息（chatOnce 走 api.post，自动 token/401/ApiError）。
      if (!stream) {
        chatOnce({ modelId, sessionId: sidAtSend ?? undefined, content: text })
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
            setMessages((ms) => ms.filter((m) => m.key !== "streaming"));
            toast.error(
              err instanceof ApiError ? err.message : "发送失败",
            );
          })
          .finally(() => setStreaming(false));
        return;
      }

      abortRef.current = chatStream(
```
同时把 `send` 的 `useCallback` 依赖数组 `[modelId, sessionId, streaming, refreshSessions]` 改为 `[modelId, sessionId, streaming, stream, refreshSessions]`。

- [ ] **Step 3: 返回值加 stream/setStream**

`useAiChat` return 对象（约 176 行起）在 `streaming,` 后加：
```tsx
    stream,
    setStream,
```

- [ ] **Step 4: AiChatHeader 加流式 Switch**

`components/ai-chat/AiChatHeader.tsx`：
1. import 加 `Switch`：
```tsx
import { Switch } from "@/components/ui/switch";
```
2. 组件签名加两个 prop（`stream`/`onStreamChange`）：
```tsx
export function AiChatHeader({
  models, modelId, onModelChange, stream, onStreamChange, onNewSession, onToggleSessions,
}: {
  models: ChatModel[];
  modelId: string;
  onModelChange: (id: string) => void;
  stream: boolean;
  onStreamChange: (v: boolean) => void;
  onNewSession: () => void;
  onToggleSessions: () => void;
}) {
```
3. 在 `</Select>` 之后、新建会话 `Button` 之前插入流式开关：
```tsx
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
        <Switch
          size="sm"
          checked={stream}
          onCheckedChange={onStreamChange}
          aria-label="流式输出"
        />
        流式
      </label>
```

- [ ] **Step 5: AiChatWidget 传 stream 给 Header**

`components/ai-chat/AiChatWidget.tsx` 的 `<AiChatHeader ...>` 加两行：
```tsx
            stream={chat.stream}
            onStreamChange={chat.setStream}
```
（加在 `onModelChange={chat.setModelId}` 之后即可。）

- [ ] **Step 6: 验证** `npx tsc --noEmit && npx eslint hooks/useAiChat.ts components/ai-chat/` PASS

- [ ] **Step 7: Commit**
```bash
git add hooks/useAiChat.ts components/ai-chat/AiChatHeader.tsx components/ai-chat/AiChatWidget.tsx
git commit -m "feat(ai-chat): 流式/非流式切换——localStorage 持久化，非流式走 chatOnce 一次性返回"
```

---

### Task 4: 全量验证 + README 同步

**Files:**
- Modify: `components/README.md`（ai-chat 条目补 Markdown/流式切换说明）

**Interfaces:**
- Consumes: 前三个任务全部。
- Produces: 无。

- [ ] **Step 1: 全量验证** `npx tsc --noEmit && npm run lint && npm run build` 全 PASS

- [ ] **Step 2: README 同步**

`components/README.md` 的 `ai-chat/` 条目末尾补一句（保持一条 bullet 风格）：
```markdown
  assistant 消息 Markdown 渲染（`AiMarkdown`：react-markdown+gfm 懒加载，prose 主题）；头部可切流式/非流式（localStorage `ai-chat-stream` 持久化，非流式走 `chatOnce`）。
```

- [ ] **Step 3: Commit**
```bash
git add components/README.md
git commit -m "docs(ai-chat): README 登记 Markdown 渲染 + 流式切换"
```

---

## Self-Review 记录

- **Spec 覆盖**：① 头部重叠(T1) ② Markdown(T2) ③ 流式切换(T3)——全覆盖。流式无打字机归因(后端缓冲)属诊断结论，已在 brainstorm 阶段给出，不需代码任务；切换本身即是对照手段。
- **占位符**：无 TBD；所有组件/修改含完整代码与上下文锚点。
- **类型一致**：`AiMarkdown({content,className?})` T2 定义→T2 接入一致；`useAiChat` 新增 `stream/setStream` T3 Step1/3 定义→Step4/5 消费一致；`chatOnce` 返回 `ChatMessage`（`sessionId/content/reasonContent/createTime/messageId` 字段 T3 Step2 使用，与 `types/ai-chat.ts` 一致）。
- **lint 红线**：stream 用 `useState(() => …)` 惰性初始化（非 effect setState）；`setStream` 是事件回调写 localStorage（非 effect）；Markdown 懒加载无 loading 组件，避开 `static-components`；`send` 分流在事件回调内。`useCallback` 依赖数组已补 `stream`。
- **Next 16**：`ssr:false` 写在 client 组件 `AiMarkdown.tsx`（符合「仅 Client Component 支持」约束）；未用任何 SSR-only 特性。
- **主题**：Markdown 样式全走 `prose` 修饰符 + `bg-muted`/`text-brand`/`border-border` token，无写死颜色。

# 申请中心路由化改造 (Route-based Views) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 申请中心 dialog-based 发起/查看/编辑 with route-based views (query-param navigation, ganDaShi `ForumInner` pattern), and add the `/processDefinition/startInfo` endpoint for the start view.

**Architecture:** Single route `/process/application`; view switching via a `View` union synced to the URL with native `window.history.pushState` + `popstate` (NOT `router.push` — static-export soft-nav is unreliable for same-path query changes). Views: `list` (no query), `start` (`?start={processDefinitionId}`), `detail` (`?view={instanceId}`), `edit` (`?edit={instanceId}`). Three dialog components are replaced by three full-view components; an `ApplicationInner` orchestrates.

**Tech Stack:** Next.js 16 static export, React 19, TS strict, Tailwind v4, shadcn/ui, sonner, lucide-react.

## Global Constraints

- **No test framework.** Per-task verify = `npx tsc --noEmit` clean + `npm run lint` clean; final task also `npm run build`.
- **Imports** `@/` only (intra-folder `./Xxx` allowed); **API** only via `lib/api` wrappers (`api.post` `{ body?, params? }`), no raw fetch.
- **Routing (static export):** view changes use native `window.history.pushState` + a `popstate` listener, exactly like `app/(front)/ganDaShi/_components/ForumInner.tsx`. Do NOT use `next/navigation` `useRouter.push` for same-path query changes.
- **React hooks v7 lint:** no `setState` synchronously in an effect body (`react-hooks/set-state-in-effect`) — use the render-phase prev-value compare pattern already in `hooks/useProcessInstancePage.ts` (depKey/prevKey); no components/maps created during render; exhaustive-deps without disable.
- **TypeScript strict; no `any`; null-safe (`?? ""`).**
- 第一版：发起/编辑只发标题（无表单数据）；查看不含创建人。

## Reference patterns to mirror

- **View switching:** `app/(front)/ganDaShi/_components/ForumInner.tsx` — `View` union, `parseView(search)`, `viewToUrl(v)`, `useState(() => parseView(window.location.search))` (with `typeof window === "undefined"` guard), `popstate` listener, `go()` = `pushState` + `setView`.
- **Render-phase reset:** `hooks/useProcessInstancePage.ts` (depKey/prevKey).

---

### Task 1: startInfo 接口 + 类型

**Files:**
- Modify: `types/process.ts` (append one type)
- Modify: `lib/api/process.ts` (append one wrapper)

**Interfaces:**
- Consumes: existing `api`, types.
- Produces (used by Task 3): `ProcessStartInfo { id?: number; processName?: string; version?: string }`; `getProcessDefinitionStartInfo(processDefinitionId: number): Promise<ProcessStartInfo>`.

- [ ] **Step 1: Append type to `types/process.ts`**

```typescript
// 发起流程时的定义信息（/processDefinition/startInfo 响应）。后续会扩展表单信息等。
export interface ProcessStartInfo {
  /** 流程定义id */
  id?: number;
  /** 流程定义名称 */
  processName?: string;
  /** 当前版本 */
  version?: string;
}
```

- [ ] **Step 2: Append wrapper to `lib/api/process.ts`** (also add `ProcessStartInfo` to the existing `import type { ... } from "@/types"`)

```typescript
// 发起流程时的定义信息：POST /processDefinition/startInfo，query 参数 processDefinitionId（注意：非 body）。响应 data = ProcessStartInfo。
export async function getProcessDefinitionStartInfo(
  processDefinitionId: number,
): Promise<ProcessStartInfo> {
  const { data } = await api.post<ProcessStartInfo>(
    "/processDefinition/startInfo",
    { params: { processDefinitionId } },
  );
  return data;
}
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` clean. (If stale `.next/types` error, run `npx next typegen` first.)

- [ ] **Step 4: Commit**

```bash
git add types/process.ts lib/api/process.ts
git commit -m "feat(process): startInfo 接口与类型（发起流程定义信息）"
```

---

### Task 2: ApplicationInner 视图编排（含 list 视图）

**Files:**
- Create: `app/(front)/process/application/_components/ApplicationInner.tsx`
- Modify: `app/(front)/process/application/page.tsx` (delegate to ApplicationInner)

**Interfaces:**
- Consumes: `InstanceListPanel`, `StartProcessSection` (still dialog-driven this task; Task 4 re-points them to `go`). `Container`, `RequirePermission`.
- Produces: `ApplicationInner()` default export — owns `View` union + `go()` + tab/refreshKey state; renders list view (header + StartProcessSection + InstanceListPanel) for `view.name === "list"`. Tasks 3–4 add the other three views and rewire. **`page.tsx` becomes a thin wrapper rendering `<RequirePermission><ApplicationInner /></RequirePermission>`.**

This task only moves existing list behavior into `ApplicationInner` and stubs the `go` plumbing (list view only; other views render nothing yet — added in Tasks 3–4). The existing dialogs still work this task (StartProcessSection/InstanceListPanel unchanged), so the page stays functional.

- [ ] **Step 1: Create `ApplicationInner.tsx`**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/Container";
import type { ProcessInstanceType } from "@/types";
import { InstanceListPanel } from "./InstanceListPanel";
import { StartProcessSection } from "./StartProcessSection";

// 视图状态：列表 / 发起 / 查看 / 编辑（query 切换，对齐 ganDaShi ForumInner）。
export type View =
  | { name: "list" }
  | { name: "start"; definitionId: number }
  | { name: "detail"; instanceId: number }
  | { name: "edit"; instanceId: number };

// 从 URL query 解析视图（?start=defId / ?view=instId / ?edit=instId / 无参=列表）。
function parseView(search: string): View {
  const p = new URLSearchParams(search);
  const start = p.get("start");
  if (start) return { name: "start", definitionId: Number(start) };
  const view = p.get("view");
  if (view) return { name: "detail", instanceId: Number(view) };
  const edit = p.get("edit");
  if (edit) return { name: "edit", instanceId: Number(edit) };
  return { name: "list" };
}

function viewToUrl(v: View): string {
  if (v.name === "start") return `/process/application?start=${v.definitionId}`;
  if (v.name === "detail") return `/process/application?view=${v.instanceId}`;
  if (v.name === "edit") return `/process/application?edit=${v.instanceId}`;
  return "/process/application";
}

// 申请中心视图编排：list / start / detail / edit 四视图切换。
// state 为主（渲染可靠），URL 用原生 pushState 同步（可分享/刷新/前进后退还原）。
// 不用 router.push：同 path 仅改 query 时静态导出的软导航不可靠。
export function ApplicationInner() {
  const [view, setView] = useState<View>(() =>
    typeof window === "undefined" ? { name: "list" } : parseView(window.location.search),
  );
  const [activeTab, setActiveTab] = useState<ProcessInstanceType>("1");
  const [refreshKey, setRefreshKey] = useState(0);

  // 前进/后退 -> 同步回 state。
  useEffect(() => {
    const onPop = () => setView(parseView(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((v: View) => {
    window.history.pushState(null, "", viewToUrl(v));
    setView(v);
  }, []);

  // 发起/编辑/存草稿成功：回列表、切对应 tab、刷新。
  const handleDone = useCallback(
    (kind: "start" | "draft") => {
      setRefreshKey((k) => k + 1);
      setActiveTab(kind === "start" ? "1" : "0");
      go({ name: "list" });
    },
    [go],
  );

  if (view.name === "start") {
    // Task 3 接入 StartView。
    return null;
  }
  if (view.name === "detail") {
    // Task 4 接入 DetailView。
    return null;
  }
  if (view.name === "edit") {
    // Task 4 接入 EditView。
    return null;
  }

  return (
    <Container className="py-8 md:py-12">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">申请中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择流程发起申请，或查看我发起的流程。
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">发起流程</h2>
        <StartProcessSection onStarted={handleDone} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">我的流程</h2>
        <InstanceListPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          refreshKey={refreshKey}
          onHandled={handleDone}
        />
      </section>
    </Container>
  );
}
```

- [ ] **Step 2: Replace `page.tsx`** (thin wrapper; guard stays at route level)

```typescript
import { RequirePermission } from "@/components/RequirePermission";
import { ApplicationInner } from "./_components/ApplicationInner";

// 申请中心：视图编排（list/start/detail/edit），见 ApplicationInner。
export default function ProcessApplicationPage() {
  return (
    <RequirePermission>
      <ApplicationInner />
    </RequirePermission>
  );
}
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` + `npm run lint` clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(front)/process/application/_components/ApplicationInner.tsx" "app/(front)/process/application/page.tsx"
git commit -m "feat(process): 申请中心视图编排 ApplicationInner（list 视图 + go/pushState 路由）"
```

---

### Task 3: StartView 发起视图（用 startInfo）

**Files:**
- Create: `app/(front)/process/application/_components/StartView.tsx`
- Modify: `app/(front)/process/application/_components/ApplicationInner.tsx` (render StartView)
- Modify: `app/(front)/process/application/_components/StartProcessSection.tsx` (re-point 发起 to `onStart(definitionId)`, drop dialog)
- Delete: `app/(front)/process/application/_components/StartProcessDialog.tsx`

**Interfaces:**
- Consumes: `getProcessDefinitionStartInfo` (Task 1), `startProcessInstance`/`saveProcessDraft`, `ProcessStartInfo`.
- Produces:
  - `StartView({ definitionId, onBack, onDone }: { definitionId: number; onBack: () => void; onDone: (kind: "start" | "draft") => void })` — fetches startInfo by definitionId, shows 流程名/版本 + title input + 存草稿/发起 buttons (payload `{ processDefinitionId, title }`, NO processInstanceId).
  - `StartProcessSection` prop changes from `onStarted` to `onStart: (definitionId: number) => void`; 发起 button calls `onStart(selected.id)` instead of opening a dialog.

- [ ] **Step 1: Create `StartView.tsx`**

Uses render-phase prev-compare for load state (no set-state-in-effect). On submit success: `toast.success` + `onDone(kind)`. On `ApiError`: `toast.error(err.message)` else generic. Submitting flag disables both buttons + spinner. A 返回 button (`onBack`) top-left.

```typescript
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  getProcessDefinitionStartInfo,
  saveProcessDraft,
  startProcessInstance,
} from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";
import type { ProcessStartInfo } from "@/types";

// 发起流程视图：按 definitionId 调 startInfo 取流程名/版本，填标题后发起/存草稿。
// 第一版只发标题（无表单数据，后续在此接表单）。
export function StartView({
  definitionId,
  onBack,
  onDone,
}: {
  definitionId: number;
  onBack: () => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [info, setInfo] = useState<ProcessStartInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  // definitionId 变化时重新进入加载态（render 期比较；effect 内只在异步回调 setState）。
  const [prevId, setPrevId] = useState(definitionId);
  if (prevId !== definitionId) {
    setPrevId(definitionId);
    setInfo(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    getProcessDefinitionStartInfo(definitionId)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [definitionId]);

  async function submit(kind: "start" | "draft") {
    if (submitting) return;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definitionId,
        title: title.trim() || undefined,
      };
      if (kind === "start") await startProcessInstance(payload);
      else await saveProcessDraft(payload);
      toast.success(kind === "start" ? "已发起" : "已存草稿");
      onDone(kind);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : kind === "start"
            ? "发起失败"
            : "保存失败",
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Container className="py-8 md:py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <header className="mb-6">
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">
              发起流程{info?.processName ? ` · ${info.processName}` : ""}
            </h1>
            {info?.version && (
              <p className="mt-1 text-sm text-muted-foreground">v{info.version}</p>
            )}
          </>
        )}
      </header>

      <div className="flex max-w-md flex-col gap-2">
        <label className="text-sm text-muted-foreground">流程标题</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="可留空，由系统自动生成"
          maxLength={100}
        />
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            disabled={loading || submitting != null}
            onClick={() => submit("draft")}
          >
            {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
            存草稿
          </Button>
          <Button disabled={loading || submitting != null} onClick={() => submit("start")}>
            {submitting === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
            发起
          </Button>
        </div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: In `ApplicationInner.tsx`, replace the `view.name === "start"` stub** with:

```typescript
  if (view.name === "start") {
    return (
      <StartView
        definitionId={view.definitionId}
        onBack={() => go({ name: "list" })}
        onDone={handleDone}
      />
    );
  }
```

Add `import { StartView } from "./StartView";`.

- [ ] **Step 3: Modify `StartProcessSection.tsx`** — change prop `onStarted: (kind) => void` → `onStart: (definitionId: number) => void`; remove `dialogOpen` state, the `StartProcessDialog` import + JSX, and the `Send` 发起 button now does `onClick={() => selected?.id != null && onStart(selected.id)}`. Remove now-unused imports (`StartProcessDialog`; `Send` stays on the button). Keep everything else identical.

- [ ] **Step 4: Update `ApplicationInner.tsx`** list-view usage of StartProcessSection to `onStart={(id) => go({ name: "start", definitionId: id })}`. (The `handleDone` for the list's InstanceListPanel stays.)

- [ ] **Step 5: Delete `StartProcessDialog.tsx`.**

- [ ] **Step 6: Verify** `npx tsc --noEmit` + `npm run lint` clean.

- [ ] **Step 7: Commit**

```bash
git add "app/(front)/process/application/_components/StartView.tsx" "app/(front)/process/application/_components/ApplicationInner.tsx" "app/(front)/process/application/_components/StartProcessSection.tsx" "app/(front)/process/application/_components/StartProcessDialog.tsx"
git commit -m "feat(process): 发起流程改为路由视图 StartView（startInfo + 删 StartProcessDialog）"
```

---

### Task 4: DetailView + EditView（替换查看/编辑对话框）

**Files:**
- Create: `app/(front)/process/application/_components/DetailView.tsx`
- Create: `app/(front)/process/application/_components/EditView.tsx`
- Modify: `app/(front)/process/application/_components/ApplicationInner.tsx` (render both)
- Modify: `app/(front)/process/application/_components/InstanceListPanel.tsx` (re-point row actions to `onView`/`onEdit` props, drop dialogs)
- Delete: `app/(front)/process/application/_components/InstanceDetailDialog.tsx`
- Delete: `app/(front)/process/application/_components/EditDraftDialog.tsx`

**Interfaces:**
- Consumes: `getProcessInstanceInfo`, `startProcessInstance`/`saveProcessDraft`, `PROCESS_INSTANCE_STATUS`/`_FALLBACK`.
- Produces:
  - `DetailView({ instanceId, onBack }: { instanceId: number; onBack: () => void })` — read-only detail rows (编号/标题/流程/版本/状态徽标/创建/更新时间), no 创建人.
  - `EditView({ instanceId, onBack, onDone }: { instanceId: number; onBack: () => void; onDone: (kind: "start" | "draft") => void })` — refetches info, editable title, 存草稿/发起 (payload `{ processDefinitionId, processInstanceId: instanceId, title }`).
  - `InstanceListPanel` props change: remove `onHandled`; add `onView: (instanceId: number) => void` and `onEdit: (instanceId: number) => void`. Row 查看/编辑 buttons call these instead of opening dialogs.

- [ ] **Step 1: Create `DetailView.tsx`** — same load pattern as StartView (render-phase prev-compare on instanceId; fetch info; skeleton rows while loading; "加载失败" if null). Read-only `<dl>` rows. 返回 button top-left.

```typescript
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getProcessInstanceInfo } from "@/lib/api/process";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";
import {
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstance,
} from "@/types";

// 查看实例详情视图：只读展示（不含创建人，第一版）。
export function DetailView({
  instanceId,
  onBack,
}: {
  instanceId: number;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<ProcessInstance | null>(null);
  const [loading, setLoading] = useState(true);

  const [prevId, setPrevId] = useState(instanceId);
  if (prevId !== instanceId) {
    setPrevId(instanceId);
    setDetail(null);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    getProcessInstanceInfo(instanceId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  const st =
    PROCESS_INSTANCE_STATUS[detail?.processStatus ?? ""] ??
    PROCESS_INSTANCE_STATUS_FALLBACK;

  const rows: { label: string; value: React.ReactNode }[] = detail
    ? [
        { label: "编号", value: detail.code || "-" },
        { label: "标题", value: detail.title || "-" },
        { label: "流程", value: detail.processDefinitionName || "-" },
        { label: "版本", value: detail.processDefinitionVersion || "-" },
        { label: "状态", value: <Badge variant={st.variant}>{st.label}</Badge> },
        { label: "创建时间", value: detail.createTime || "-" },
        { label: "更新时间", value: detail.updateTime || "-" },
      ]
    : [];

  return (
    <Container className="py-8 md:py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">流程详情</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail?.processDefinitionName ?? ""}
          {detail?.processDefinitionVersion ? ` · v${detail.processDefinitionVersion}` : ""}
        </p>
      </header>
      {loading ? (
        <div className="flex max-w-md flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : detail == null ? (
        <p className="py-6 text-sm text-muted-foreground">加载失败</p>
      ) : (
        <dl className="flex max-w-md flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3 text-sm">
              <dt className="w-20 shrink-0 text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 flex-1 break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Create `EditView.tsx`** — fetch info on mount (render-phase compare), prefill title + keep `processDefinitionId`, editable title input, 存草稿/发起 with payload `{ processDefinitionId, processInstanceId: instanceId, title }`; success → `toast.success` + `onDone(kind)`; ApiError → toast. 返回 button.

```typescript
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import {
  getProcessInstanceInfo,
  saveProcessDraft,
  startProcessInstance,
} from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";

// 编辑草稿视图：按 id 回填标题，改后存草稿/发起（body 带 processInstanceId 提交既有草稿）。
export function EditView({
  instanceId,
  onBack,
  onDone,
}: {
  instanceId: number;
  onBack: () => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [definitionId, setDefinitionId] = useState<number | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaVersion, setMetaVersion] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  const [prevId, setPrevId] = useState(instanceId);
  if (prevId !== instanceId) {
    setPrevId(instanceId);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    getProcessInstanceInfo(instanceId)
      .then((data) => {
        if (cancelled) return;
        setDefinitionId(data.processDefinitionId ?? null);
        setMetaName(data.processDefinitionName ?? "");
        setMetaVersion(data.processDefinitionVersion ?? "");
        setTitle(data.title ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setDefinitionId(null);
        toast.error("加载草稿失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  async function submit(kind: "start" | "draft") {
    if (definitionId == null || submitting) return;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definitionId,
        processInstanceId: instanceId,
        title: title.trim() || undefined,
      };
      if (kind === "start") await startProcessInstance(payload);
      else await saveProcessDraft(payload);
      toast.success(kind === "start" ? "已发起" : "已存草稿");
      onDone(kind);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : kind === "start"
            ? "发起失败"
            : "保存失败",
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <Container className="py-8 md:py-12">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        返回
      </Button>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">编辑草稿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {metaName}
          {metaVersion ? ` · v${metaVersion}` : ""}
        </p>
      </header>
      {loading ? (
        <Skeleton className="h-9 w-full max-w-md" />
      ) : (
        <div className="flex max-w-md flex-col gap-2">
          <label className="text-sm text-muted-foreground">流程标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可留空，由系统自动生成"
            maxLength={100}
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              disabled={submitting != null}
              onClick={() => submit("draft")}
            >
              {submitting === "draft" && <Loader2 className="h-4 w-4 animate-spin" />}
              存草稿
            </Button>
            <Button disabled={submitting != null} onClick={() => submit("start")}>
              {submitting === "start" && <Loader2 className="h-4 w-4 animate-spin" />}
              发起
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 3: In `ApplicationInner.tsx`, replace the `detail` and `edit` stubs** with `DetailView`/`EditView` (both `onBack={() => go({ name: "list" })}`; EditView also `onDone={handleDone}`). Add imports. Update the list-view `InstanceListPanel` to the new props `onView={(id) => go({ name: "detail", instanceId: id })}` and `onEdit={(id) => go({ name: "edit", instanceId: id })}` (remove `onHandled`).

- [ ] **Step 4: Modify `InstanceListPanel.tsx`** — props: remove `onHandled`; add `onView: (instanceId: number) => void` and `onEdit: (instanceId: number) => void`. Remove `viewingId`/`editingId` state, the two dialog imports + JSX. Row 查看 button → `onClick={() => r.id != null && onView(r.id)}`; 编辑 button → `onClick={() => r.id != null && onEdit(r.id)}`. Keep everything else identical.

- [ ] **Step 5: Delete `InstanceDetailDialog.tsx` and `EditDraftDialog.tsx`.**

- [ ] **Step 6: Verify** `npx tsc --noEmit` + `npm run lint` clean, then `npm run build` (static export succeeds, `/process/application` exported).

- [ ] **Step 7: Commit**

```bash
git add "app/(front)/process/application/_components/DetailView.tsx" "app/(front)/process/application/_components/EditView.tsx" "app/(front)/process/application/_components/ApplicationInner.tsx" "app/(front)/process/application/_components/InstanceListPanel.tsx" "app/(front)/process/application/_components/InstanceDetailDialog.tsx" "app/(front)/process/application/_components/EditDraftDialog.tsx"
git commit -m "feat(process): 查看/编辑改为路由视图 DetailView/EditView（删对话框）"
```

---

## Self-Review Notes

- **Spec coverage:** startInfo endpoint+type (Task 1); route-based 发起 (Task 3 StartView + `?start=`), 查看 (Task 4 DetailView + `?view=`), 编辑 (Task 4 EditView + `?edit=`); ganDaShi pushState/popstate pattern (Task 2 ApplicationInner); dialogs removed (Tasks 3/4); title-only, no 创建人, no form data (all view components). All covered.
- **Placeholder scan:** Tasks 2's `return null` stubs are intentional scaffolding replaced in Tasks 3/4 (each stub names its replacing task) — not unimplemented plan gaps. All other steps carry full code.
- **Type consistency:** `View` union, `go()`, `handleDone(kind)`, `StartView({definitionId,onBack,onDone})`, `DetailView({instanceId,onBack})`, `EditView({instanceId,onBack,onDone})`, `StartProcessSection({onStart})`, `InstanceListPanel({activeTab,onTabChange,refreshKey,onView,onEdit})` — consistent across Tasks 2–4.

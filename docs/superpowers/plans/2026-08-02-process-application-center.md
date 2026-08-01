# 申请中心 (Process Application Center) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the front-office 申请中心 page (`/process/application`): start a process instance from a deployed definition (title only), and browse my instances in a tabbed, searchable, paginated list.

**Architecture:** Next.js App Router static export; all data fetched client-side via `lib/api` wrappers returning `ApiResponse<T>` / throwing `ApiError`. Page is a thin route under `app/(front)/process/application/` with route-private components in `_components/`. Follows the existing process-designer list patterns (`ProcessListPanel` + `useProcessDefinitionPage`).

**Tech Stack:** Next.js 16 (App Router, `output:'export'`), React 19, TypeScript strict, Tailwind v4, shadcn/ui (`Tabs`, `Command`, `Popover`, `Dialog`, `Table`, `Select`, `Badge`, `Button`, `Input`, `Skeleton`), `sonner` toasts, `lucide-react`.

## Global Constraints

- **No tests / no test framework.** Verification per task = `npx tsc --noEmit` clean, then `npm run lint` clean, and at the end `npm run build` succeeds.
- **Imports** always use `@/` alias; no deep relative `../../`.
- **API** calls only through `lib/api/` wrappers (`api.post` takes `{ body?, params? }`); never raw `fetch`.
- **Lint traps** (see project CLAUDE.md "通用坑"): no `setState` synchronously inside an effect body (`react-hooks/set-state-in-effect`); no components/maps created during render (`react-hooks/static-components`); Radix `SelectContent` use `position="popper"` when the trigger is near a container edge; **Popover inside Dialog gets its wheel blocked** — use a non-passive wheel listener on the scroll container if the dropdown must scroll.
- **Naming:** components PascalCase, hooks `useXxx.ts`, folders kebab-case. One component per file.
- **Types** in `types/`; avoid `any`; null-safe fallbacks (`?? ""`, `?? 0`) for backend nullable fields.
- 标题可空（后端兜底）；第一版不渲染/不提交表单数据，不做草稿编辑，列表无行操作。

---

### Task 1: 类型定义 (types/process.ts)

**Files:**
- Modify: `types/process.ts` (append at end)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 2–6): `DeployedProcessDefinition`, `ProcessInstance`, `ProcessInstanceType = "1" | "5" | "0"`, `ProcessInstancePageParam`, `ProcessHandleParam`, `PROCESS_INSTANCE_STATUS`, `PROCESS_INSTANCE_STATUS_FALLBACK`, `INSTANCE_TABS`.

- [ ] **Step 1: Append the types**

```typescript
// ===== 申请中心（流程实例，第一版）=====

// 已部署流程（/processDefinition/deployList 元素）。发起流程的下拉选项。
export interface DeployedProcessDefinition {
  /** 流程id */
  id?: number;
  /** 流程定义名称 */
  processName?: string;
  /** 当前版本 */
  version?: string;
}

// 流程实例（/processInstance/queryPage 元素）。processStatus：0 草稿 / 10 已完成 / 其他 审批中。
export interface ProcessInstance {
  /** 流程实例id */
  id?: number;
  /** 流程定义id */
  processDefinitionId?: number;
  /** 流程定义名称 */
  processDefinitionName?: string;
  /** 流程定义版本 */
  processDefinitionVersion?: string;
  /** 流程标题 */
  title?: string;
  /** 流程编号 */
  code?: string;
  /** 流程状态：0 草稿 / 10 已完成 / 其他 审批中 */
  processStatus?: string;
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime?: string;
  /** 更新时间（yyyy-MM-dd HH:mm:ss） */
  updateTime?: string;
}

// 查询类型：1 我发起的(进行中) / 5 我发起的(全部) / 0 草稿。
export type ProcessInstanceType = "1" | "5" | "0";

// 分页查询参数（POST /processInstance/queryPage body）。
export interface ProcessInstancePageParam {
  /** 查询类型 */
  type: ProcessInstanceType;
  /** 页大小 */
  size: number;
  /** 当前页码 */
  current: number;
  /** 搜索（可空） */
  search?: string;
}

// 发起 / 存草稿请求体（POST /processInstance/start | /processInstance/saveDraft）。响应只看 code。
export interface ProcessHandleParam {
  /** 流程定义id（必填） */
  processDefinitionId: number;
  /** 流程标题（可空，后端兜底） */
  title?: string;
}

// 实例状态徽标映射。键外（非 0/10）视为审批中。
export const PROCESS_INSTANCE_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  "0": { label: "草稿", variant: "secondary" },
  "10": { label: "已完成", variant: "default" },
};

// 审批中（默认/回退）徽标。
export const PROCESS_INSTANCE_STATUS_FALLBACK = {
  label: "审批中",
  variant: "outline" as const,
};

// 列表 tab（顺序：进行中 / 全部 / 草稿）。
export const INSTANCE_TABS: { value: ProcessInstanceType; label: string }[] = [
  { value: "1", label: "进行中" },
  { value: "5", label: "全部" },
  { value: "0", label: "草稿" },
];
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: clean (types/index.ts already `export * from "./process"`).

- [ ] **Step 3: Commit**

```bash
git add types/process.ts
git commit -m "feat(process): 申请中心类型定义（实例/已部署流程/分页与状态映射）"
```

---

### Task 2: API wrappers (lib/api/process.ts)

**Files:**
- Modify: `lib/api/process.ts` (append at end)

**Interfaces:**
- Consumes: types from Task 1; existing `api` from `@/lib/api`; `Page` from `@/types`.
- Produces (used by Tasks 3–6): `getDeployList()`, `queryProcessInstancePage(params)`, `startProcessInstance(payload)`, `saveProcessDraft(payload)`.

- [ ] **Step 1: Extend the existing `import type { ... } from "@/types"` to also include `DeployedProcessDefinition`, `ProcessHandleParam`, `ProcessInstance`, `ProcessInstancePageParam`.**

- [ ] **Step 2: Append the wrappers**

```typescript
// ===== 申请中心（流程实例，第一版）=====

// 已部署流程列表：POST /processDefinition/deployList，无参。响应 data = DeployedProcessDefinition[]。
export async function getDeployList(): Promise<DeployedProcessDefinition[]> {
  const { data } = await api.post<DeployedProcessDefinition[]>(
    "/processDefinition/deployList",
  );
  return data;
}

// 实例分页：POST /processInstance/queryPage，body ProcessInstancePageParam。
export async function queryProcessInstancePage(
  params: ProcessInstancePageParam,
): Promise<Page<ProcessInstance>> {
  const { data } = await api.post<Page<ProcessInstance>>(
    "/processInstance/queryPage",
    { body: params },
  );
  return data;
}

// 发起流程：POST /processInstance/start，body ProcessHandleParam。响应只看 code。
export async function startProcessInstance(
  payload: ProcessHandleParam,
): Promise<void> {
  await api.post<unknown>("/processInstance/start", { body: payload });
}

// 保存草稿：POST /processInstance/saveDraft，body ProcessHandleParam。响应只看 code。
export async function saveProcessDraft(
  payload: ProcessHandleParam,
): Promise<void> {
  await api.post<unknown>("/processInstance/saveDraft", { body: payload });
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add lib/api/process.ts
git commit -m "feat(process): 申请中心 API（deployList/queryPage/start/saveDraft）"
```

---

### Task 3: 分页 hook (hooks/useProcessInstancePage.ts)

**Files:**
- Create: `hooks/useProcessInstancePage.ts`

**Interfaces:**
- Consumes: `queryProcessInstancePage` (Task 2), `Page`/`ProcessInstance`/`ProcessInstanceType` (Task 1).
- Produces: `useProcessInstancePage(params): { page, loading }` — mirrors `useProcessDefinitionPage` exactly.

- [ ] **Step 1: Create the hook**

```typescript
"use client";

import { useEffect, useState } from "react";
import { queryProcessInstancePage } from "@/lib/api/process";
import type { Page, ProcessInstance, ProcessInstanceType } from "@/types";

// 分页查询我的流程实例。任一参数或 refreshKey 变化时重拉。
export function useProcessInstancePage(params: {
  type: ProcessInstanceType;
  search: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { type, search, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<ProcessInstance> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${type}|${search}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryProcessInstancePage({ type, search: search || undefined, current, size })
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch(() => {
        if (!cancelled) setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  return { page, loading };
}
```

(Note: copy the exact effect-body shape from `hooks/useProcessDefinitionPage.ts`, including its dependency-array comment/disable pattern, so lint matches the existing hook.)

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add hooks/useProcessInstancePage.ts
git commit -m "feat(process): useProcessInstancePage 分页 hook"
```

---

### Task 4: 发起流程区块 + 对话框

**Files:**
- Create: `app/(front)/process/application/_components/StartProcessDialog.tsx`
- Create: `app/(front)/process/application/_components/StartProcessSection.tsx`

**Interfaces:**
- Consumes: `getDeployList`/`startProcessInstance`/`saveProcessDraft` (Task 2), `DeployedProcessDefinition` (Task 1).
- Produces:
  - `StartProcessDialog({ definition, open, onOpenChange, onDone }: { definition: DeployedProcessDefinition | null; open: boolean; onOpenChange: (o: boolean) => void; onDone: (kind: "start" | "draft") => void })`
  - `StartProcessSection({ onStarted }: { onStarted: (kind: "start" | "draft") => void })`

- [ ] **Step 1: Create `StartProcessDialog.tsx`** — controlled; local `title`; `submitting` flag disables both buttons + spinner; success `toast.success` + close + `onDone(kind)`; `ApiError` → `toast.error(err.message)` else generic.

```typescript
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { saveProcessDraft, startProcessInstance } from "@/lib/api/process";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeployedProcessDefinition } from "@/types";

// 发起/存草稿对话框：输入流程标题（可空，后端兜底），两个提交动作。第一版只发标题，不带表单数据。
export function StartProcessDialog({
  definition,
  open,
  onOpenChange,
  onDone,
}: {
  definition: DeployedProcessDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (kind: "start" | "draft") => void;
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState<"start" | "draft" | null>(null);

  async function submit(kind: "start" | "draft") {
    if (definition?.id == null || submitting) return;
    setSubmitting(kind);
    try {
      const payload = {
        processDefinitionId: definition.id,
        title: title.trim() || undefined,
      };
      if (kind === "start") await startProcessInstance(payload);
      else await saveProcessDraft(payload);
      toast.success(kind === "start" ? "已发起" : "已存草稿");
      onOpenChange(false);
      setTitle("");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>发起流程</DialogTitle>
          <DialogDescription>
            {definition?.processName ?? "未命名流程"}
            {definition?.version ? ` · v${definition.version}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">流程标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="可留空，由系统自动生成"
            maxLength={100}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `StartProcessSection.tsx`** — fetch deploy list on mount; combobox = `Popover` + `Command` (client-side filter by name); 发起 button enabled when selected; owns the dialog. (Popover is on the page, not inside the Dialog → no wheel-block trap.)

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Send } from "lucide-react";
import { getDeployList } from "@/lib/api/process";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DeployedProcessDefinition } from "@/types";
import { StartProcessDialog } from "./StartProcessDialog";

// 发起流程区块：搜索式下拉选择已部署流程 + 「发起」按钮，弹出标题对话框。
export function StartProcessSection({
  onStarted,
}: {
  onStarted: (kind: "start" | "draft") => void;
}) {
  const [list, setList] = useState<DeployedProcessDefinition[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDeployList()
      .then((data) => {
        if (!cancelled) setList(data);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => list?.find((d) => d.id === selectedId) ?? null,
    [list, selectedId],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list ?? [];
    return (list ?? []).filter((d) =>
      (d.processName ?? "").toLowerCase().includes(q),
    );
  }, [list, query]);

  if (list == null) {
    return <Skeleton className="h-9 w-full max-w-md rounded-md" />;
  }
  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无已发布的流程可发起。</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full max-w-md justify-between font-normal"
          >
            <span className="truncate">
              {selected
                ? `${selected.processName ?? "未命名流程"}${selected.version ? ` · v${selected.version}` : ""}`
                : "选择要发起的流程"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="搜索流程名称..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>无匹配流程</CommandEmpty>
              <CommandGroup>
                {filtered.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={`${d.processName ?? ""} ${d.id}`}
                    onSelect={() => {
                      setSelectedId(d.id ?? null);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === d.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{d.processName ?? "未命名流程"}</span>
                    {d.version && (
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        v{d.version}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button disabled={selected == null} onClick={() => setDialogOpen(true)}>
        <Send className="h-4 w-4" />
        发起
      </Button>

      <StartProcessDialog
        definition={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDone={onStarted}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "app/(front)/process/application/_components/StartProcessDialog.tsx" "app/(front)/process/application/_components/StartProcessSection.tsx"
git commit -m "feat(process): 申请中心发起流程区块（搜索下拉 + 标题对话框）"
```

---

### Task 5: 我的流程列表面板

**Files:**
- Create: `app/(front)/process/application/_components/InstanceListPanel.tsx`

**Interfaces:**
- Consumes: `useProcessInstancePage` (Task 3), `INSTANCE_TABS`/`PROCESS_INSTANCE_STATUS`/`PROCESS_INSTANCE_STATUS_FALLBACK`/`ProcessInstanceType` (Task 1).
- Produces: `InstanceListPanel({ activeTab, onTabChange, refreshKey }: { activeTab: ProcessInstanceType; onTabChange: (t: ProcessInstanceType) => void; refreshKey: number })` — tab state lifted to parent.

- [ ] **Step 1: Create the panel**

Reuse `getPageNumbers` (copy verbatim from `ProcessListPanel.tsx`). Owns `searchInput`/`search` (300ms debounce) + `current`/`size`; resets `current=1` on search/tab change. Columns: 编号/标题/流程/版本/状态/创建时间/更新时间. No row actions. Footer: 共 N 条 + size Select([10,20,50]) + page buttons + prev/next.

```typescript
"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useProcessInstancePage } from "@/hooks/useProcessInstancePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  INSTANCE_TABS,
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstanceType,
} from "@/types";

const PAGE_SIZES = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// 我的流程列表：tab（进行中/全部/草稿）+ 防抖搜索 + 表格 + 分页。纯展示，无行操作（第一版）。
export function InstanceListPanel({
  activeTab,
  onTabChange,
  refreshKey,
}: {
  activeTab: ProcessInstanceType;
  onTabChange: (t: ProcessInstanceType) => void;
  refreshKey: number;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const { page, loading } = useProcessInstancePage({
    type: activeTab,
    search,
    current,
    size,
    refreshKey,
  });

  // 搜索防抖。
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            onTabChange(v as ProcessInstanceType);
            setCurrent(1);
          }}
        >
          <TabsList>
            {INSTANCE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索标题 / 编号"
            className="h-9 w-56 pl-8"
          />
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">编号</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">标题</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">流程</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">版本</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">状态</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">创建时间</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">更新时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell
                      key={j}
                      className={j >= 2 && j !== 4 ? "hidden lg:table-cell" : ""}
                    >
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="h-40 text-center text-sm text-muted-foreground"
                >
                  暂无流程记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => {
                const st =
                  PROCESS_INSTANCE_STATUS[r.processStatus ?? ""] ??
                  PROCESS_INSTANCE_STATUS_FALLBACK;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.code || "-"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm font-medium">
                      {r.title || "-"}
                    </TableCell>
                    <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionName || "-"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionVersion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.createTime || "-"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.updateTime || "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v));
              setCurrent(1);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current <= 1}
            onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-1">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === current ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrent(n)}
              >
                {n}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current >= totalPages}
            onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(front)/process/application/_components/InstanceListPanel.tsx"
git commit -m "feat(process): 申请中心我的流程列表（tab/搜索/分页/状态徽标）"
```

---

### Task 6: 页面组装 (page.tsx)

**Files:**
- Modify: `app/(front)/process/application/page.tsx` (replace `ComingSoon`)

**Interfaces:**
- Consumes: `StartProcessSection`, `InstanceListPanel`, `RequirePermission`, `Container`, `ProcessInstanceType`.
- Produces: the assembled route. Owns `activeTab` + `refreshKey`; `onStarted` bumps `refreshKey` and switches tab (`start`→`"1"`, `draft`→`"0"`).

- [ ] **Step 1: Replace the page**

```typescript
"use client";

import { useState } from "react";
import { Container } from "@/components/Container";
import { RequirePermission } from "@/components/RequirePermission";
import type { ProcessInstanceType } from "@/types";
import { InstanceListPanel } from "./_components/InstanceListPanel";
import { StartProcessSection } from "./_components/StartProcessSection";

// 申请中心：发起流程（搜索下拉 + 标题对话框）+ 我的流程列表（tab/搜索/分页）。第一版只发标题，无表单数据、无行操作。
export default function ProcessApplicationPage() {
  const [activeTab, setActiveTab] = useState<ProcessInstanceType>("1");
  const [refreshKey, setRefreshKey] = useState(0);

  // 发起/存草稿成功后：刷新列表并切到对应 tab（发起→进行中，草稿→草稿）。
  function handleStarted(kind: "start" | "draft") {
    setRefreshKey((k) => k + 1);
    setActiveTab(kind === "start" ? "1" : "0");
  }

  return (
    <RequirePermission>
      <Container className="py-8 md:py-12">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold">申请中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            选择流程发起申请，或查看我发起的流程。
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">发起流程</h2>
          <StartProcessSection onStarted={handleStarted} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">我的流程</h2>
          <InstanceListPanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            refreshKey={refreshKey}
          />
        </section>
      </Container>
    </RequirePermission>
  );
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: static export succeeds; `/process/application` in exported routes.

- [ ] **Step 4: Commit**

```bash
git add "app/(front)/process/application/page.tsx"
git commit -m "feat(process): 申请中心页面组装（发起 + 我的流程列表）"
```

---

## Self-Review Notes

- **Spec coverage:** deployList (Task 4 combobox), queryPage type/size/current/search (Tasks 1/3/5), start + saveDraft title-only (Tasks 2/4), tabs 进行中/全部/草稿 in that order (Task 1 `INSTANCE_TABS` + Task 5), searchable dropdown (Task 4), no form data / no draft edit / no row ops / nullable title (Tasks 2/4/5). All covered.
- **Placeholder scan:** none — all steps carry full code.
- **Type consistency:** `ProcessInstanceType`, `ProcessHandleParam`, `INSTANCE_TABS`, `useProcessInstancePage`, `StartProcessSection({onStarted})`, `InstanceListPanel({activeTab,onTabChange,refreshKey})` names/signatures match across Tasks 1–6.

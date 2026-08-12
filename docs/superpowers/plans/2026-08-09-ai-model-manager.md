# AI 模型管理 ModelManagerPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现后台 `/console/ai/model-manager` 模型管理页——扁平分页列表 + 搜索 + 新增/编辑弹窗 + 删除确认，替换现有 `ComingSoon` 占位。

**Architecture:** 复刻 `website-manager` 的四层模式：`types/ai-model.ts`（类型）→ `lib/api/aiModel.ts`（typed wrapper，5 接口）→ `hooks/useAiModelPage.ts`（分页查询）→ `page.tsx` + `_components/AiModelFormDialog.tsx`（UI）。后端字符串 id。

**Tech Stack:** Next.js 16 (static export) / React 19 / TS strict / Tailwind v4 / shadcn/ui / sonner。

## Global Constraints

- **Static export**：无 SSR/Server Actions；运行时数据一律客户端 `api.post` 从 `/joker-box/*` 拉（`lib/api/client.ts` 自动附 token）。
- **导入一律 `@/`**，禁 `../../`。
- **TS strict，无 `any`**。
- **id 是 `string`**（后端字符串 id，非 number）。
- **可空字段**：`completionsPath`、`embeddingsPath`、`apiKey`、`description`；`name`、`model` 必填。
- **组件文件 PascalCase、hook `useXxx.ts`、一文件一组件**。
- 路由私有组件放该路由 `_components/`。
- toast 用 `import { toast } from "sonner"`。
- 业务错误抛 `ApiError`（`err instanceof ApiError ? err.message : "兜底文案"`）。
- **lint 红线**：`react-hooks/set-state-in-effect`（effect 内只在异步回调 setState；初始值用 render 期条件 setState）、`react-hooks/static-components`（不在渲染期动态拼组件）。
- 验证命令：`npx tsc --noEmit`、`npm run lint`、`npm run build`。

---

### Task 1: 类型层 `types/ai-model.ts`

**Files:**
- Create: `types/ai-model.ts`
- Modify: `types/index.ts`（barrel 加一行）

**Interfaces:**
- Consumes: `Page<T>`（来自 `types/api.ts`，已在 barrel）。
- Produces: `AiModel`、`AiModelDetail`、`AiModelPageParam`、`AiModelPayload`、`AiModelUpdatePayload` —— 后续所有任务用这些名字。

- [ ] **Step 1: 写类型文件**

创建 `types/ai-model.ts`：

```typescript
// AI 模型管理相关类型（对应 /ai/model/* 接口）。
// 列表项 AiModel 无 apiKey/baseUrl/paths；编辑需走 /ai/model/info 拉 AiModelDetail 回填。

/** 模型列表项（/ai/model/queryPage records 元素）。 */
export interface AiModel {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
  /** 描述 */
  description: string;
}

/** 模型详情（/ai/model/info 返回，含敏感/连接字段，用于编辑回填）。 */
export interface AiModelDetail {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
  /** API密钥（可空） */
  apiKey: string;
  /** 基础URL */
  baseUrl: string;
  /** completions请求路径（可空） */
  completionsPath: string;
  /** embeddings请求路径（可空） */
  embeddingsPath: string;
  /** 描述（可空） */
  description: string;
}

/** /ai/model/queryPage body。 */
export interface AiModelPageParam {
  search?: string;
  current: number;
  size: number;
}

/** 新增/修改共用字段（completionsPath/embeddingsPath/apiKey/description 可空）。 */
export interface AiModelPayload {
  name: string;
  model: string;
  baseUrl: string;
  completionsPath: string;
  embeddingsPath: string;
  apiKey: string;
  description: string;
}

/** 修改（/ai/model/update）= 共用字段 + id。 */
export type AiModelUpdatePayload = AiModelPayload & { id: string };
```

- [ ] **Step 2: 挂 barrel**

`types/index.ts` 在 `export * from "./api-path";` 之后（保持字母序）插入：

```typescript
export * from "./ai-model";
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS（无新增错误）

- [ ] **Step 4: Commit**

```bash
git add types/ai-model.ts types/index.ts
git commit -m "feat(ai-model): 类型层——AiModel/AiModelDetail/PageParam/Payload"
```

---

### Task 2: 数据层 `lib/api/aiModel.ts`

**Files:**
- Create: `lib/api/aiModel.ts`

**Interfaces:**
- Consumes: `api`（`@/lib/api`）、`Page`/`AiModel`/`AiModelDetail`/`AiModelPageParam`/`AiModelPayload`/`AiModelUpdatePayload`（`@/types`，Task 1）。
- Produces: `queryAiModelPage`、`getAiModelInfo`、`addAiModel`、`updateAiModel`、`removeAiModel` —— hook 和弹窗用。

- [ ] **Step 1: 写 wrapper**

创建 `lib/api/aiModel.ts`：

```typescript
import { api } from "@/lib/api";
import type {
  AiModel,
  AiModelDetail,
  AiModelPageParam,
  AiModelPayload,
  AiModelUpdatePayload,
  Page,
} from "@/types";

// AI 模型管理接口（/ai/model/*）。全部 POST + body 传参；业务错误由 client 抛 ApiError。

// 模型分页：POST /ai/model/queryPage。
export async function queryAiModelPage(
  params: AiModelPageParam,
): Promise<Page<AiModel>> {
  const { data } = await api.post<Page<AiModel>>("/ai/model/queryPage", {
    body: params,
  });
  return data;
}

// 模型详情：POST /ai/model/info，body 传 {id}（编辑回填用，含 apiKey/baseUrl/paths）。
export async function getAiModelInfo(id: string): Promise<AiModelDetail> {
  const { data } = await api.post<AiModelDetail>("/ai/model/info", {
    body: { id },
  });
  return data;
}

// 新增：POST /ai/model/add，判断 code。
export async function addAiModel(payload: AiModelPayload): Promise<void> {
  await api.post<unknown>("/ai/model/add", { body: payload });
}

// 修改：POST /ai/model/update，含 id，判断 code。
export async function updateAiModel(
  payload: AiModelUpdatePayload,
): Promise<void> {
  await api.post<unknown>("/ai/model/update", { body: payload });
}

// 删除：POST /ai/model/remove，body 传 {id}，判断 code。
export async function removeAiModel(id: string): Promise<void> {
  await api.post<unknown>("/ai/model/remove", { body: { id } });
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/api/aiModel.ts
git commit -m "feat(ai-model): 数据层 5 接口——queryPage/info/add/update/remove"
```

---

### Task 3: 分页 hook `hooks/useAiModelPage.ts`

**Files:**
- Create: `hooks/useAiModelPage.ts`

**Interfaces:**
- Consumes: `queryAiModelPage`（Task 2）、`Page`/`AiModel`（`@/types`）。
- Produces: `useAiModelPage(params): { page: Page<AiModel> | null; loading: boolean }` —— page.tsx 用。

- [ ] **Step 1: 写 hook**

创建 `hooks/useAiModelPage.ts`（render 期条件 setState 回 loading，effect 只在异步回调 setState，避开 `set-state-in-effect`）：

```typescript
"use client";

import { useEffect, useState } from "react";
import { queryAiModelPage } from "@/lib/api/aiModel";
import type { AiModel, Page } from "@/types";

// 分页查询模型列表。任一参数或 refreshKey 变化时重拉。
export function useAiModelPage(params: {
  search: string;
  current: number;
  size: number;
  refreshKey: number;
}) {
  const { search, current, size, refreshKey } = params;
  const [page, setPage] = useState<Page<AiModel> | null>(null);
  const [loading, setLoading] = useState(true);

  // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const depKey = `${search}|${current}|${size}|${refreshKey}`;
  const [prevKey, setPrevKey] = useState(depKey);
  if (prevKey !== depKey) {
    setPrevKey(depKey);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    queryAiModelPage({ search: search || undefined, current, size })
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
  }, [search, current, size, refreshKey]);

  return { page, loading };
}
```

- [ ] **Step 2: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS，无 `react-hooks/set-state-in-effect` 告警指向本文件。

- [ ] **Step 3: Commit**

```bash
git add hooks/useAiModelPage.ts
git commit -m "feat(ai-model): useAiModelPage 分页 hook"
```

---

### Task 4: 表单弹窗 `_components/AiModelFormDialog.tsx`

**Files:**
- Create: `app/console/ai/model-manager/_components/AiModelFormDialog.tsx`

**Interfaces:**
- Consumes: `getAiModelInfo`/`addAiModel`/`updateAiModel`（Task 2）、`ApiError`（`@/lib/api`）、`AiModel`/`AiModelPayload`（`@/types`）、shadcn `Dialog/Input/Textarea/Label/Button/Skeleton`。
- Produces: `AiModelFormDialog({open, onOpenChange, editing, onSuccess})` —— page.tsx 用。`editing: AiModel | null`。

- [ ] **Step 1: 写弹窗**

要点：render 期条件 setState 处理 open/editing 切换（同 WebsiteFormDialog）；editing 非 null 时先 `detailLoading=true` + effect 异步 `getAiModelInfo` 回填 8 字段，期间表单区骨架；editing null 用 EMPTY。校验仅 name/model 非空。

创建 `app/console/ai/model-manager/_components/AiModelFormDialog.tsx`：

```typescript
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addAiModel, getAiModelInfo, updateAiModel } from "@/lib/api/aiModel";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AiModel, AiModelPayload } from "@/types";

type FormState = AiModelPayload;

const EMPTY: FormState = {
  name: "",
  model: "",
  baseUrl: "",
  completionsPath: "",
  embeddingsPath: "",
  apiKey: "",
  description: "",
};

// 新增 / 编辑模型。editing 非 null 时为编辑：开弹窗即 loading，/ai/model/info 返回后回填全量。
// name/model 必填；baseUrl/completionsPath/embeddingsPath/apiKey/description 可空。
export function AiModelFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModel | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      if (editing) {
        // 编辑：先 loading（清旧值防闪现），effect 异步拉详情回填。
        setDetailLoading(true);
        setForm(EMPTY);
      } else {
        setDetailLoading(false);
        setForm(EMPTY);
      }
    }
  }

  useEffect(() => {
    if (!open || !editingId) return;
    let cancelled = false;
    getAiModelInfo(editingId)
      .then((d) => {
        if (cancelled) return;
        setForm({
          name: d.name,
          model: d.model,
          baseUrl: d.baseUrl ?? "",
          completionsPath: d.completionsPath ?? "",
          embeddingsPath: d.embeddingsPath ?? "",
          apiKey: d.apiKey ?? "",
          description: d.description ?? "",
        });
      })
      .catch((err) => {
        if (!cancelled)
          toast.error(err instanceof ApiError ? err.message : "加载详情失败");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editingId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("请输入名称");
      return;
    }
    if (!form.model.trim()) {
      toast.error("请输入模型");
      return;
    }
    setBusy(true);
    try {
      const payload: AiModelPayload = {
        name: form.name.trim(),
        model: form.model.trim(),
        baseUrl: form.baseUrl.trim(),
        completionsPath: form.completionsPath.trim(),
        embeddingsPath: form.embeddingsPath.trim(),
        apiKey: form.apiKey.trim(),
        description: form.description,
      };
      if (editing) {
        await updateAiModel({ id: editing.id, ...payload });
        toast.success("已保存");
      } else {
        await addAiModel(payload);
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模型" : "新增模型"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改模型配置。" : "新建一个 AI 模型。"}
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[96px_1fr] items-center gap-x-4 gap-y-3">
              <Label className="text-sm text-muted-foreground">名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="如 GPT-4o"
              />
              <Label className="text-sm text-muted-foreground">模型 *</Label>
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="如 gpt-4o"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">基础URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://api.example.com"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">
                completions
              </Label>
              <Input
                value={form.completionsPath}
                onChange={(e) => set("completionsPath", e.target.value)}
                placeholder="/v1/chat/completions"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">
                embeddings
              </Label>
              <Input
                value={form.embeddingsPath}
                onChange={(e) => set("embeddingsPath", e.target.value)}
                placeholder="/v1/embeddings"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">API密钥</Label>
              <Input
                value={form.apiKey}
                onChange={(e) => set("apiKey", e.target.value)}
                placeholder="sk-..."
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="一句话描述（可选）"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy || detailLoading}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS，无 `set-state-in-effect` / `static-components` 告警。

- [ ] **Step 3: Commit**

```bash
git add app/console/ai/model-manager/_components/AiModelFormDialog.tsx
git commit -m "feat(ai-model): 新增/编辑弹窗——编辑走 info 回填，name/model 必填"
```

---

### Task 5: 页面 `page.tsx` + README 同步

**Files:**
- Modify: `app/console/ai/model-manager/page.tsx`（整体重写）
- Modify: `app/console/README.md`（占位 → 正式条目）

**Interfaces:**
- Consumes: `useAiModelPage`（Task 3）、`removeAiModel`（Task 2）、`ApiError`、`AiModel`（`@/types`）、`AiModelFormDialog`（Task 4）、shadcn `Table/Select/Skeleton/Button/Input/AlertDialog`。
- Produces: 完整路由页（最终交付）。

- [ ] **Step 1: 重写页面**

复刻 website-manager 的搜索防抖 / 骨架 / 空态 / 省略号分页 / 删除 AlertDialog。列 = 名称 / 模型(mono) / 描述 / 操作（编辑+删除）。

将 `app/console/ai/model-manager/page.tsx` 重写为：

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAiModelPage } from "@/hooks/useAiModelPage";
import { removeAiModel } from "@/lib/api/aiModel";
import { ApiError } from "@/lib/api";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AiModel } from "@/types";
import { AiModelFormDialog } from "./_components/AiModelFormDialog";

const PAGE_SIZES = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// AI 模型管理：扁平列表 + 分页 + 搜索。CRUD：新增/编辑（AiModelFormDialog，编辑走 info 回填）、
// 删除（AlertDialog 二次确认）。无分组/树。
export default function ModelManagerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AiModel | null>(null);
  const [deleting, setDeleting] = useState<AiModel | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useAiModelPage({ search, current, size, refreshKey });

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(record: AiModel) {
    setEditing(record);
    setFormOpen(true);
  }
  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await removeAiModel(deleting.id);
      toast.success("已删除");
      setDeleting(null);
      handleMutated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除失败");
    }
  }

  function reset() {
    setSearchInput("");
    setSearch("");
    setCurrent(1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-lg font-semibold">模型管理</h1>
        <Button onClick={openAdd} size="sm" className="ml-auto">
          <Plus className="h-4 w-4" />
          新增模型
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索名称/模型"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>
      </div>

      {/* 表格 */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-muted-foreground">名称</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">模型</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">描述</TableHead>
              <TableHead className="w-24 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j} className={j === 2 ? "hidden lg:table-cell" : ""}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-40 text-center text-sm text-muted-foreground">
                  暂无模型
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id} className="group">
                  <TableCell className="text-sm font-medium">{record.name}</TableCell>
                  <TableCell className="font-mono text-xs">{record.model}</TableCell>
                  <TableCell className="hidden max-w-64 truncate text-xs text-muted-foreground lg:table-cell">
                    {record.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(record)}
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(record)}
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
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
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / 页
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current <= 1}
            onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === current ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrent(p)}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={current >= totalPages}
            onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AiModelFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSuccess={handleMutated}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: README 同步**

`app/console/README.md` 第 24 行把 `ai/model-manager/` 从占位清单移除，并在「其它」分组末尾（`system/code-table` 之后）加一条：

```markdown
- `ai/model-manager/`：AI 模型管理。扁平列表+分页+搜索（`useAiModelPage`）。CRUD：新增/编辑（`AiModelFormDialog`——编辑开弹窗即 loading、`/ai/model/info` 回填全量；name/model 必填，completionsPath/embeddingsPath/apiKey/description 可空）、删除（AlertDialog 确认，`/ai/model/remove` body{id}）。无分组/树。`(AiModelFormDialog)`。
```

并把第 24 行改为：

```markdown
- `displayBoard/`、`crawler-task-manager/`、`system/system-prompt/`：占位。
```

- [ ] **Step 3: 全量验证**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 全部 PASS；静态导出成功；无新增 lint 告警。

- [ ] **Step 4: 手动验证（dev）**

`npm run dev` → `/console/ai/model-manager`：
- 列表分页/搜索/每页条数正常。
- 新增：仅填 name/model 可提交；可空字段留空也行。
- 编辑：弹窗先 loading、再回填 8 字段；改后保存重拉。
- 删除：AlertDialog 确认后列表移除并重拉。

- [ ] **Step 5: Commit**

```bash
git add app/console/ai/model-manager/page.tsx app/console/README.md
git commit -m "feat(ai-model): 模型管理页——分页列表+搜索+新增/编辑弹窗+删除确认"
```

---

## Self-Review 记录

- **Spec 覆盖**：5 接口（Task 2）、类型（Task 1）、分页 hook（Task 3）、编辑 info 回填（Task 4）、删除确认（Task 5）、README 同步（Task 5）、可空/必填校验（Task 4）、apiKey 普通 Input（Task 4）——全覆盖。
- **占位符**：无 TBD/TODO；所有代码步骤含完整代码。
- **类型一致**：`AiModelPayload`（Task 1 定义）被 Task 2/4 用；`AiModelUpdatePayload = AiModelPayload & {id}`（Task 1）被 Task 2 `updateAiModel`、Task 4 `updateAiModel({id, ...payload})` 用；`removeAiModel(id: string)`（Task 2）与 Task 5 `removeAiModel(deleting.id)` 一致；`useAiModelPage({search,current,size,refreshKey})`（Task 3）与 Task 5 调用一致。

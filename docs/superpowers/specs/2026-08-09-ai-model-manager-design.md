# 模型管理 ModelManagerPage 设计

日期：2026-08-09
路由：`/console/ai/model-manager`（当前为 `ComingSoon` 占位，本次实现）

## 目标

后台 AI 模型管理的标准 CRUD 页：扁平分页列表 + 搜索 + 新增/编辑弹窗。完全复刻 `website-manager` 的既有模式（数据层 → hook → 页面 → 弹窗四层），落位现有占位路由。

四个后端接口：

| 接口 | 方法 | body | 响应 data |
|---|---|---|---|
| `/ai/model/queryPage` | POST | `{size, current, search?}` | `Page<AiModel>` |
| `/ai/model/info` | POST | `{id}` | `AiModelDetail` |
| `/ai/model/add` | POST | 7 字段（无 id） | 判断 code |
| `/ai/model/update` | POST | `{id}` + 7 字段 | 判断 code |
| `/ai/model/remove` | POST | `{id}` | 判断 code |

`AiModel`（列表项）= `{id, name, model, description}`。
`AiModelDetail`（info）= `{id, name, model, apiKey, baseUrl, completionsPath, embeddingsPath, description}`。
可空字段：`completionsPath`、`embeddingsPath`、`apiKey`、`description`；`name`、`model` 必填。

## 决策（已与用户确认）

- **编辑回填**：点编辑先开弹窗、弹窗内 loading、`/ai/model/info` 返回后填表单。列表项没有 apiKey/baseUrl/paths，必须走 info 拉全量。
- **删除**：操作列加「删除」（Trash2 icon），AlertDialog 二次确认（同 website-manager），`removeAiModel(id)` → POST `/ai/model/remove` body `{id}`，成功 toast + `setRefreshKey` 重拉。
- **apiKey 展示**：普通 `Input`（不打码、无眼睛切换）。

## 文件改动（5 个）

1. **`types/ai-model.ts`**（新建）
   - `AiModel` — 列表项（4 字段）。
   - `AiModelDetail` — info（8 字段全）。
   - `AiModelPageParam` — `{search?, current, size}`。
   - `AiModelPayload` — add/update 共用 7 字段；update 额外带 `id`。
   - 在 `types/index.ts` barrel 增加 `export * from "./ai-model"`。

2. **`lib/api/aiModel.ts`**（新建）— 5 个 typed wrapper（`api.post`，destructure `.data`；业务错误抛 `ApiError`）：
   - `queryAiModelPage(params: AiModelPageParam): Promise<Page<AiModel>>` → POST `/ai/model/queryPage` body。
   - `getAiModelInfo(id: string): Promise<AiModelDetail>` → POST `/ai/model/info` body `{id}`。
   - `addAiModel(payload: AiModelPayload): Promise<void>` → POST `/ai/model/add` body。
   - `updateAiModel(payload: AiModelPayload & {id: string}): Promise<void>` → POST `/ai/model/update` body。
   - `removeAiModel(id: string): Promise<void>` → POST `/ai/model/remove` body `{id}`。
   - `id` 为 `String`（后端字符串 id，非 number）。

3. **`hooks/useAiModelPage.ts`**（新建）— 收 `{search, current, size, refreshKey}`，返回 `{page, loading}`。
   - render 期条件 setState 回 loading（depKey 比对），effect 只在异步回调 setState（对齐 `useWebsitePage`，避开 `set-state-in-effect`）。
   - `search` 空串传 `undefined`。

4. **`app/console/ai/model-manager/page.tsx`**（重写，去 ComingSoon）
   - `"use client"`。状态：searchInput/search（防抖 300ms）、current/size、refreshKey、formOpen、editing(`AiModel | null`)、deleting(`AiModel | null`)。
   - 布局：标题 + 「新增模型」按钮 / 搜索框 / 表格 / 分页（页码 + 省略号 + 每页条数 Select）。
   - 表格列：**名称 / 模型（mono）/ 描述 / 操作**。操作列 = 编辑（Pencil）+ 删除（Trash2，destructive）。
   - 删除：点删除 → `setDeleting(record)` 开 AlertDialog（「确认删除「{name}」？此操作不可撤销。」）→ 确认调 `removeAiModel(deleting.id)`，成功 toast「已删除」+ 关弹窗 + `setRefreshKey` 重拉；失败 `ApiError` toast。
   - loading 骨架行、空态「暂无模型」、`getPageNumbers` 省略号逻辑复用 website-manager 同款。
   - 编辑 → 开弹窗并传 `editing`（弹窗内自取 info）；新增 → `editing=null`。`onSuccess` → `setRefreshKey(k=>k+1)`。

5. **`app/console/ai/model-manager/_components/AiModelFormDialog.tsx`**（新建）
   - 新增/编辑共用。`editing: AiModel | null` 区分。
   - **回填时机（render 期条件 setState 模式，同 WebsiteFormDialog）**：`open`/`editingId` 变化时——editing 非 null 则进入 `loadingDetail=true` 并 effect 异步 `getAiModelInfo(id)` 回填 8 字段；editing null 则用 EMPTY。
   - **编辑态弹窗内 loading**：detail 未返回时表单区显骨架/禁用，避免空表单闪现。
   - 字段：`name`*、`model`*（Input）；`baseUrl`、`completionsPath`、`embeddingsPath`、`apiKey`（均 Input，可空）；`description`（Textarea，可空）。
   - 校验：仅 `name`、`model` 非空（toast 提示），其余直通。
   - 提交：editing 非 null → `updateAiModel({id, ...payload})`，否则 → `addAiModel(payload)`。成功 toast + `onOpenChange(false)` + `onSuccess()`；失败 `ApiError` toast。

## 约定对齐

- 命名（PascalCase 组件 / `useXxx` hook）、`@/` 导入、`cn`、主题 token、sonner toast、shadcn `Dialog/Input/Textarea/Label/Table/Select/Skeleton` 全部对齐现有 console 页。
- 严格 TS，无 `any`。
- README 同步：`app/console/README.md` 把 `ai/model-manager` 从「占位」清单移到正式条目（一句话职责 + `_components` + hook）。

## 测试 / 验证

- `npx tsc --noEmit` 类型检查通过。
- `npm run lint` 无新增告警（重点：`react-hooks/set-state-in-effect`、`react-hooks/static-components`）。
- `npm run build` 静态导出成功。
- 手动：列表分页/搜索、新增、编辑（info 回填、可空字段留空提交）、删除（AlertDialog 确认）、刷新后重拉。

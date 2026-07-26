# 前台动态表单填写页 — 设计

日期：2026-07-26
路由：`/dynamicForm?formId=<id>&version=<v>`（前台 `(front)` 组，需登录）

## 目标

把后台「动态表单设计器」已发布的表单，以填写页形式开放给前台登录用户：按 `formId + version` 拉取 `info` 渲染真实控件，填写校验后 `submit` 提交。**本次只做「新增提交」，不做实例回显/编辑。**

## 范围与非目标

- **做**：按版本渲染（分组/24 栅格/19 种控件）、联动规则、远程选项数据源、提交前校验、UPLOAD 走 `/file/uploadDynamicForm`、提交 `/dynamicForm/submit`、成功后「提交成功 + 再填一次」。
- **不做**：`formInstanceId` 更新语义、按实例回显/编辑、草稿保存、分页/列表、提交记录查询。

## 接口契约

### 渲染：`POST /dynamicForm/info`
- 复用现有 `getDynamicFormInfo(id, version)`（`lib/api/dynamicForm.ts`），body `{ id: formId, version }`。
- 必传 `version`，所以**只可能拿到该发布版本**，不会回落到 DRAFT。
- 响应 `data` = `DynamicForm`（`fields`/`groups`/`linkageRules`/`name`/`description`）。

### 提交：`POST /dynamicForm/submit`（JSON body）
- **request body** = `{ formId: String, version: String, data: Map<fieldId, value>, formInstanceId: String? }`（`FormData` 是后端用来接收 body 的 Java 对象，**不是**前端要发的 multipart FormData）。
- `formInstanceId: String?` 后端支持「更新某条已提交实例」，**本次前台不传**。
- 响应：判断 `code === 200`；`data` = 表单实例 id（本次仅 toast/调试用，不消费）。
- 新增 `lib/api/dynamicForm.ts` 包装 `submitDynamicForm({ formId, version, data, formInstanceId? })`：**走 `api.post({ body })`**（同 `/dynamicForm/*` 其它接口的 JSON body 方式，**非 multipart**）。`data` 直接作 JSON 对象随 body 发送。签名预留 `formInstanceId?: string`，本次调用方不传。

> ✅ 已与后端确认：前端发 JSON body，`data` 为 `fieldId→value` 的 JSON 对象，**后端负责反序列化**。

## 架构与代码组织

核心判断：**填写态运行引擎已存在**——`FormPreviewDialog`（设计器预览）已经用真实控件 + 联动 + 校验 + 远程选项 + 24 栅格把「按 DesignerState 渲染可填表单」做完了。填写页与预览唯一差别是**数据源**（`info` 而非 designer state）和**提交去向**（`submit` 接口而非 toast）。所以方案是**抽取共享渲染器**，不在前台重写一套表单引擎。

### 抽取共享渲染器（console 模块内，跨模块共享）
把 `FormPreviewDialog` 的渲染/取值/联动/校验/收集逻辑抽成一个与 Dialog 外壳解耦的组件：

- 新文件 `app/console/form/dynamicForm-manager/_components/DynamicFormRenderer.tsx`
  - Props：`{ fields, groups, linkageRules, values, errors, onChange(fieldId, value), effState 依赖内部算 }`——受控：值与错误由父持有，渲染器管联动求值（`computeFieldState`）、远程选项（`useRemoteOptions`）、VALUE 边沿触发、24 栅格 + 分组折叠渲染、`PreviewField` 控件分派。
  - 从 `FormPreviewDialog` 平移：`allFields` 拼装、`valueOf`/`setValue`、`effState` Map（含 API 数据源异常 → disabled+required:0）、VALUE 边沿 effect、`PreviewGroup`/`PreviewField`。
  - 暴露 `collectData()`（隐/禁字段不进、空值跳过）与 `validate()`（遍历 `validateFieldState`）的能力，经 ref 或受控回调交给父。
- `FormPreviewDialog` 改为薄壳：保留 Dialog + 「查看数据」+ 重置，内部渲染 `<DynamicFormRenderer>`，行为不变。

> 说明：渲染器放进 console 模块的 `_components` 是因为 19 种控件、`linkage.ts`、`validate.ts`、`useRemoteOptions.ts`、`designer-state.ts` 全住在那里，渲染器必须与它们同目录才能 import（下划线目录不参与路由，但可被前台 import——项目无跨模块 import 禁令，只有「路由私件放 `_components`」的约定）。前台页面**不复制**这些引擎文件。

### 前台页面
- `app/(front)/dynamicForm/page.tsx`（`'use client'`）
  - `<RequireAuth>` 包裹（仅登录；与 `/file-server` 一致）。
  - `useSearchParams` 读 `formId`/`version`；**缺任一 → 显错误态**（`ErrorState`「缺少参数 formId/version」），静态导出下 `useSearchParams` 需 `<Suspense>` 边界。
  - 新 hook `hooks/useDynamicFormFill.ts`：`info` 加载（`getDynamicFormInfo(formId, version)`）+ `values`/`errors` state + `submitting`/`submitted` 状态机 + `submit()`/`reset()`。
  - 渲染 `<DynamicFormRenderer fields groups linkageRules values errors onChange>` + 顶栏（表单名 `h1` + 描述）+ 底栏（重置 / 提交 Button，`submitting` 时 loading 禁用）。
  - **提交成功 → 成功态视图**：隐藏表单，显「提交成功」提示 + 「再填一次」按钮（点击 → **重拉 `info`** 保证一致性，回初始填写态）。
- 提交数据组装 = 渲染器 `collectData()`（已含：隐/禁字段剔除、空值跳过、UPLOAD 值=FileInfo/FileInfo[]、DATERANGE=`[start,end]`、TABLE=行对象数组、级联=路径数组）。

## 数据流

```
URL ?formId&version
  └─ page (RequireAuth + useSearchParams)
      └─ useDynamicFormFill
          ├─ getDynamicFormInfo(formId, version) ──► DynamicForm
          ├─ values/errors 受控 state
          └─ submit():
               DynamicFormRenderer.validate()  ──失败──► 错字提示（组内错强制展开）
               └─通过► collectData()
                     └─ submitDynamicForm({formId, version, data: JSON.stringify})
                           ──code=200──► submitted 成功态
      └─ DynamicFormRenderer（联动/远程选项/校验/收集）
```

## 错误处理

- **缺 formId/version**：`ErrorState`，不发请求。
- **info 失败**（`ApiError`，含 401→`handleUnauthorized` 清 token、403、表单不存在/版本不存在）：`ErrorState` 显 `err.message`。
- **远程选项数据源异常**：沿用渲染器逻辑——该字段 disabled、required 置 0、不占校验、不进提交数据（`__sourceError` 占位显「数据源异常」）。
- **submit 失败**：`toast.error(err.message)`，停留填写态，值保留。
- **校验失败**：`toast.error("N 个字段校验未通过")`，字段级红字，折叠组强制展开（沿用预览行为）。

## 守卫 / 主题 / 通用坑

- 守卫：`<RequireAuth>`（未登录 → 404 ErrorState，与全站守卫一致）。
- 主题：全部走 token（`bg-background`/`text-foreground`/`border`/`bg-brand` 等），不硬编码色值；渲染器与控件本就 token 驱动，5 预设 × 明暗自动跟随。
- `react-hooks/set-state-in-effect`：VALUE 边沿 effect 沿用预览的 ref 模式，不在 effect 里同步 setState。
- 静态导出：无 SSR，`useSearchParams` 包 `<Suspense>`；运行时数据全客户端拉。
- 弹窗内滚轮：级联/多选下拉已是内联绝对定位（不 portal），无 Dialog 滚轮问题（填写页非 Dialog）。

## 测试 / 验证

无测试框架。验证方式：
1. `npm run lint` + `npx tsc --noEmit` 通过。
2. 手动：设计器发布一张含分组 + 联动（SHOW/REQUIRED/OPTION/VALUE）+ 远程选项 + UPLOAD + TABLE + DATERANGE 的表单 → 前台 `/dynamicForm?formId=&version=` 打开 → 校验拦截 → 填写提交 → 确认 `submit` FormData 携带 formId/version/data → 成功态 → 再填一次。

## 待确认

无（`data` 序列化由后端处理、「再填一次」重拉 `info` 均已确认）。

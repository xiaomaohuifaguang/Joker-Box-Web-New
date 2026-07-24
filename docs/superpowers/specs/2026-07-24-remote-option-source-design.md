# 动态表单设计器 — 远程数据源（API 选项）设计

日期：2026-07-24
状态：已确认（后端契约对齐 + 用户逐决策确认）

## 背景

选项类字段（SELECT/MULTISELECT/RADIO/CHECKBOX/CASCADER/MULTICASCADER）的 options 目前只能手动配死。本版加**远程数据源**：options 运行时从 API 拉取。后端契约已定（`optionSource`），前端按此对齐。

## 已确认决策

| 决策点 | 结论 |
|---|---|
| type 枚举 | **STATIC**（手动 options）/ **API**（远程拉取）。码表只是 API 的一个**预设**（快捷填充 url+params+mapping），不单列类型 |
| 字段依赖 | `params` 的 value 支持 **`${fieldId}` 占位**：运行时取该表单字段当前值替换后请求，该字段值变化**自动重拉**（级联数据源） |
| 接口范围 | 仅本项目后端（/joker-box 相对路径，走 lib/api 带 token） |
| 配置入口 | 选项弹窗里加「数据来源」切换（STATIC 手动 / API 远程） |
| 本期范围 | **API 模式完整做**（url/method/params/mapping 全可配 + 字段依赖重拉 + 码表预设） |

## 1. 数据模型（对齐后端契约，types/dynamic-form.ts）

```ts
// 选项数据来源（仅选项类字段）。不配或 type=STATIC = 手动 options。
export interface DynamicFormOptionSource {
  type: "STATIC" | "API";
  url?: string;                          // API：/joker-box 相对路径
  method?: "GET" | "POST";               // API：默认 POST
  params?: Record<string, unknown>;      // API：静态请求参数；value 支持 "${fieldId}" 占位取表单字段值
  mapping?: DynamicFormOptionMapping;    // API：响应映射
}

// API 响应映射。
export interface DynamicFormOptionMapping {
  listPath?: string;      // 候选项数组路径，响应根数组用 "$"，默认 "$"；点路径如 "data.list"
  labelPath?: string;     // 选项显示文本字段路径，默认 "label"
  valuePath?: string;     // 选项值字段路径，默认 "value"
  childrenPath?: string;  // 子选项字段路径（级联），默认 "children"
}
```

`DynamicFormField` 加 `optionSource?: DynamicFormOptionSource`（仅选项类用）。`toPayload`/`stateFromForm` 走 `stripClient` 全展开自动带上。

### options 与 optionSource 取值优先级（关键）

字段可能同时残留手动 `options` 和 `optionSource`（切换残留）。统一规则：

| 场景 | 取值 |
|---|---|
| `optionSource.type === "API"` | **以远程拉取为准**；手动 options 仅作远程未拉到/失败时的兜底，非正式数据源 |
| 无 `optionSource` 或 `type === "STATIC"` | 以手动 `options` 为准 |
| API 拉取**成功（含空数组）** | 用远程结果——拉到空就是空，显「暂无可用选项」，**不回退**手动（远程是准） |
| API 拉取**失败 / 未加载** | 回退手动 `options` 兜底 |

配套约定：
- 配置 UI 切到 API 时**保留**手动 options（不删，便于切回 STATIC 恢复），但标注「远程优先生效，手动选项仅兜底」。
- 设计态**默认值编辑器**对 API 字段：远程数据设计态拉不到，用手动 options 兜底渲染（若有），否则提示「运行时按远程选项选值」。
- 联动规则引用该字段值（VALUE/OPTION/条件触发）逻辑不变——值仍是 value 字符串，与来源无关。

**说明**：后端响应统一是 `ApiResponse<T>` 包 `{code,data,...}`，lib/api 已剥到 `data`。所以 `listPath` 的 `$` 指 **data 本身**（lib/api 返回的就是 data）；若 data 内还嵌套（如 `data.list`），用点路径。本文统一：listPath 解析基于 lib/api 返回的 data。

## 2. 路径解析 + 占位替换（_components/optionSource.ts，纯函数）

- `resolvePath(obj, path)`：点路径取值。`"$"` 或空 = obj 本身；`"list"`/`"data.list"` 逐层取。返回 undefined 兜底。
- `substituteParams(params, values)`：遍历 params，value 是字符串且含 `${fieldId}` 时用 `values[fieldId]` 替换（整个 value 就是一个占位 → 直接取字段值，保留类型；嵌入字符串里 → 字符串拼接）。返回新 Map + 本次依赖到的 fieldId 集合 `collectDeps(params)`。
- `mapOptions(raw, mapping)`：把 resolvePath 出的候选项数组，按 labelPath/valuePath/childrenPath 映射成 `DynamicFormOption[]`（children 递归，childrenPath 默认 "children"）。label/value 缺失的项跳过。

## 3. API 调用（lib/api/dynamicForm.ts 或本地）

不新增固定接口封装——url 是用户配的。在 optionSource.ts 或 FormPreviewDialog 里用 `api.post/get`：
```ts
// GET -> api.get(url, params); POST -> api.post(url, { body: params })。
// 返回 lib/api 剥过的 data，再 resolvePath(data, mapping.listPath) 取候选数组。
```
仅允许 /joker-box 相对路径（配置 UI 校验：以 `/` 开头、不含 `://`）。

## 4. 运行时拉取（预览，useRemoteOptions hook）

`useRemoteOptions(fields, values)`（在 FormPreviewDialog 内或独立 hook）：

- 扫描 fields，对 `optionSource.type==="API"` 的选项类字段：
  - 用 `substituteParams` 算实际参数 + 依赖 fieldId 集。
  - **依赖值变化自动重拉**：把该字段的依赖值（`depFieldIds.map(id=>values[id])`）纳入请求 key，值变 -> 重新拉。
  - 结果存 `Map<fieldId, DynamicFormOption[]>`。
- 渲染时按「取值优先级」覆盖 `field.options`（见 §1）：拉取**成功（含空数组）**用远程结果（空即空，显「暂无可用选项」，不回退）；**失败/未加载**回退手动 options。
- 依赖字段值未填时：含 `${fieldId}` 占位的参数若字段值空，**跳过请求**，显「请先填写依赖字段」（避免无意义请求），此时展示手动 options 兜底。
- 加载中显「加载中…」（仍展示手动 options 兜底，拉到后替换）；失败 toast + 回退手动 options。
- 拉到的 options 走 `visibleOptions()` 过滤（远程无 visible 字段默认全显），级联 children 递归可用。

## 5. 配置 UI（选项弹窗加切换）

`OptionsDialog`（FieldConfigPanel）顶部加「数据来源」切换（STATIC 手动选项 / API 远程，ToggleGroup 或 Radio）：

- **STATIC**：现有 OptionsEditor。
- **API**：表单——
  - 预设 Select：「码表选项」一键填 url=`/code-table/options`、method=POST、params=`{code:""}`、mapping 默认（listPath=`$`，label/value/children 默认）。选中后用户补 code。也可「自定义」全手填。
  - url 输入（校验 /joker-box 相对路径）。
  - method Select（GET/POST，默认 POST）。
  - params 编辑器：键值对列表（key=参数名，value=值 或 `${fieldId}` 占位；提供「插入字段引用」下拉选表单字段，自动填 `${fieldId}`）。可增删。
  - mapping：listPath（默认 `$`）+ labelPath/valuePath/childrenPath（默认 label/value/children）四个输入，留空用默认。
- 切换写入 `field.optionSource`；切回 STATIC 清 optionSource。
- 选项摘要按钮：API 显示「远程：{url}」或码表预设显示「码表：{code}」。

## 6. 联动/校验/查看数据兼容

- 远程 options 字段可作条件触发（值仍是 value 字符串）、OPTION/VALUE 目标。OPTION 动作对远程字段意义有限（远程优先），不特殊处理。
- **默认值**：远程字段默认值编辑在设计态未拉数据——本期默认值编辑对 API 字段显示「运行时按远程选项选值」（YAGNI）；预览运行时默认值能匹配拉到的 options 正常回显。
- **查看数据**：值照常进 JSON。

## 不做（本期 YAGNI）

- 任意外部 URL（仅 /joker-box 相对路径）。
- params 占位除 `${fieldId}` 外的表达式/函数。
- 请求防抖/缓存/并发去重（依赖变化即拉，量级小）。
- 远程 options 的默认值编辑器接远程数据。

## 任务拆分（实现计划）

1. **类型 + 路径/占位纯函数**：`DynamicFormOptionSource`/`Mapping` + `DynamicFormField.optionSource` + `optionSource.ts`（resolvePath/substituteParams/collectDeps/mapOptions）+ 纯函数断言自测。
2. **运行时 hook**：`useRemoteOptions` + FormPreviewDialog 接入（拉取/依赖重拉/覆盖 field.options/加载失败兜底）。
3. **配置 UI**：OptionsDialog 加 STATIC/API 切换 + API 表单（预设/url/method/params/mapping 编辑）。
4. **文档 + 构建**：CLAUDE.md + build。

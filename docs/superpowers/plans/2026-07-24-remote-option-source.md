# 远程数据源（API 选项）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`)。

**Goal:** 动态表单选项类字段支持远程数据源——`optionSource`（STATIC/API），API 模式运行时从 /joker-box 接口拉选项，params 支持 `${fieldId}` 占位 + 字段依赖自动重拉，码表作为 API 预设。

**Architecture:** 字段加 `optionSource`（对齐后端契约）；`optionSource.ts` 纯函数管路径解析/占位替换/映射；`useRemoteOptions` hook 在预览拉取并按取值优先级覆盖 options；选项弹窗加 STATIC/API 切换 + API 表单。

**Tech Stack:** Next.js 16 静态导出 + React 19 + TS strict + Tailwind v4 + shadcn/ui。

**Spec:** `docs/superpowers/specs/2026-07-24-remote-option-source-design.md`（取值优先级见 §1，必读）。

## Global Constraints

- 路径别名 `@/*` → 项目根；导入用 `@/...`，禁深相对 `../../`。
- TS strict，避免 `any`（`unknown` 用 `Array.isArray`/`typeof` 窄化）。
- react-hooks v7：不在 useEffect 里 setState 同步 props（用 render 守卫块）；但**数据拉取的副作用**（远程请求）在 effect 里是合法的。
- shadcn/ui 在 `@/components/ui/*`；图标 `lucide-react`。中文注释。无新依赖。
- **取值优先级**（关键，贯穿所有任务）：`type==="API"` 以远程为准；拉取**成功（含空数组）**用远程结果（空即空，不回退）；**失败/未加载**回退手动 `options`。
- 后端契约：`optionSource{type,url,method,params:Map,mapping{listPath,labelPath,valuePath,childrenPath}}`；`$` = lib/api 剥过的 data。
- 仅 /joker-box 相对路径（url 以 `/` 开头、不含 `://`）。

---

### Task 1: 类型 + optionSource.ts 纯函数

**Files:**
- Modify: `types/dynamic-form.ts`
- Create: `app/console/form/dynamicForm-manager/_components/optionSource.ts`

**Interfaces:**
- Produces:
  - `DynamicFormOptionSource { type:"STATIC"|"API"; url?; method?:"GET"|"POST"; params?:Record<string,unknown>; mapping?:DynamicFormOptionMapping }`
  - `DynamicFormOptionMapping { listPath?; labelPath?; valuePath?; childrenPath? }`
  - `DynamicFormField.optionSource?: DynamicFormOptionSource`
  - `resolvePath(obj: unknown, path?: string): unknown` — `$`/空/undefined = obj 本身；点路径逐层取，缺失返回 undefined。
  - `collectDeps(params?: Record<string,unknown>): string[]` — 收集所有 `${fieldId}` 占位的 fieldId（去重）。
  - `substituteParams(params, values: Record<string,unknown>): Record<string,unknown>` — value 整串是单个 `${fieldId}` → 取字段值（保留类型）；含 `${fieldId}` 的子串 → 字符串替换；非字符串原样。
  - `mapOptions(raw: unknown, mapping?: DynamicFormOptionMapping): DynamicFormOption[]` — raw 经 listPath 已是数组则直接用，否则对 raw 再 resolvePath(listPath)；按 label/value/children path 映射（默认 label/value/children），children 递归，label 或 value 缺失的项跳过。

- [ ] **Step 1:** types/dynamic-form.ts 加 `DynamicFormOptionMapping`、`DynamicFormOptionSource`、`DynamicFormField.optionSource`（放 options 附近），中文注释。
- [ ] **Step 2:** optionSource.ts 实现 4 个纯函数（导入 `DynamicFormOption`/`DynamicFormOptionMapping` type）。占位正则 `/\$\{([^}]+)\}/g`。
- [ ] **Step 3:** 自测断言（临时 node 脚本内联复刻，或控制器统一验）：resolvePath `$`/点路径/缺失；collectDeps 去重；substituteParams 整串占位保留类型 + 子串替换 + 非字符串原样；mapOptions 默认路径 + children 递归 + 缺 label/value 跳过 + listPath 嵌套。
- [ ] **Step 4:** `npx tsc --noEmit` 过。
- [ ] **Step 5:** Commit `feat: optionSource 类型 + 路径/占位/映射纯函数`

---

### Task 2: useRemoteOptions hook + 预览接入

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/useRemoteOptions.ts`
- Modify: `app/console/form/dynamicForm-manager/_components/FormPreviewDialog.tsx`

**Interfaces:**
- Consumes: Task 1 的 `collectDeps`/`substituteParams`/`mapOptions`/`resolvePath`；`lib/api` 的 `api.get/api.post`。
- Produces: `useRemoteOptions(fields: DynamicFormField[], values: Record<string,unknown>): { optionsOf: (f: DynamicFormField) => DynamicFormOption[] | undefined; loading: (fieldId: string) => boolean }`。
  - `optionsOf(f)`：f 配了 API 且远程已成功（含空数组）→ 返回远程 options；否则返回 undefined（调用方回退 f.options）。

- [ ] **Step 1:** `useRemoteOptions`：
  - 对每个 `optionSource?.type==="API"` 的字段，用 `collectDeps` 得依赖；`values` 里依赖值 join 成请求 key。
  - 依赖字段值有空（undefined/""）→ 跳过请求（该字段 optionsOf 返回 undefined，回退手动）。
  - effect 里按 key 拉取：GET `api.get(url, params)` / POST `api.post(url, {body: params})`，得 data，`resolvePath(data, mapping?.listPath)`，`mapOptions` 映射，存 `Map<fieldId, DynamicFormOption[]>` state。失败 toast.error + 不存（回退手动）。loading 存 `Set<fieldId>`。
  - url 校验：非 `/` 开头或含 `://` → 不请求 + toast。
  - 依赖值变化 → key 变 → effect 重拉。用 ref 防重复/竞态（后发覆盖先发）。
- [ ] **Step 2:** FormPreviewDialog 接入：
  - 调 `useRemoteOptions(allFields, currentValues())` 得 `optionsOf`/`loading`。
  - 渲染 PreviewField 前：若 `optionsOf(f) !== undefined`，把 field 的 `options` 覆盖为远程结果再传给控件（`{...f, options: remote}`）；否则用原 field（手动 options 兜底）。
  - 注意与 computeFieldState 的 options（OPTION 动作）叠加顺序：OPTION 动作命中优先于远程？——按 spec「OPTION 对远程字段不特殊处理」，让 OPTION 动作的 state.options 覆盖（命中时），未命中用远程/手动。即在 PreviewGroup 里 `options: st.options ?? optionsOf(f) ?? f.options`（computeFieldState 默认返回 field.options，OPTION 命中时返回 actionValue）。**实现时确认 computeFieldState 的 options 默认=field.options，需要让远程在「field.options」这一层就被替换**：更干净的做法是把远程 options 先合并进 field（`fieldWithRemote = {...f, options: optionsOf(f) ?? f.options}`），再把这个 field 传给 computeFieldState——这样 OPTION 未命中时 state.options=远程 options，命中时=actionValue。
- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint` 这两文件过。
- [ ] **Step 4:** Commit `feat: useRemoteOptions 预览拉取远程选项 + 依赖重拉`

---

### Task 3: 配置 UI（选项弹窗 STATIC/API 切换 + API 表单）

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/FieldConfigPanel.tsx`

**Interfaces:**
- Consumes: `DynamicFormOptionSource`、现有 `OptionsDialog`、表单字段列表（fields，供「插入字段引用」下拉）。注意 FieldConfigPanel 当前只接收单个 field + onChange，需要能拿到全部字段列表做字段引用下拉——检查 FieldConfigPanel 的 props，若无 fields 则需从 FormDesigner 传入（参考 LinkagePanel 拿 allFields 的方式）。

- [ ] **Step 1:** OptionsDialog 顶部加「数据来源」切换（ToggleGroup 或 Radio：STATIC 手动选项 / API 远程）。读 `field.optionSource?.type === "API"` 定当前。
- [ ] **Step 2:** STATIC → 现有 OptionsEditor。切到 STATIC：`onChange({optionSource: undefined})`（保留手动 options）。
- [ ] **Step 3:** API → 表单：
  - 预设 Select：「码表选项」填 `{url:"/code-table/options", method:"POST", params:{code:""}, mapping:{}}`；「自定义」清空。用户补 code。
  - url Input（校验 `/` 开头不含 `://`，非法标红提示）。
  - method Select（GET/POST，默认 POST）。
  - params 编辑器：键值对列表（key=参数名 Input，value=值 Input 支持手输 `${fieldId}`；「插入字段引用」下拉列出其他选项类/任意字段 title，选中往当前 value 追加/设置为 `${fieldId}`）。可增删行。
  - mapping：listPath（占位 `$`）/labelPath/valuePath/childrenPath 四个 Input，留空用默认（label/value/children）。
  - 所有改动写 `field.optionSource`（type:"API"）。
  - 提示文案：「远程选项运行时拉取，优先生效；手动选项仅兜底」。
- [ ] **Step 4:** 选项摘要按钮文案：STATIC 显示现有「N 个选项」；API 显示「远程：{url}」或码表预设识别出 url==/code-table/options 显示「码表：{params.code}」。
- [ ] **Step 5:** FieldConfigPanel 若需 fields 列表（字段引用下拉），从 FormDesigner 传入 allFields（参考 designer.allGroupNames 类似；检查 designer-state 是否有 allFields，没有则在 FormDesigner 算 `[...fields, ...groups.flatMap(g=>g.fields)]` 传入）。
- [ ] **Step 6:** `npx tsc --noEmit` + `npx eslint` 过。
- [ ] **Step 7:** Commit `feat: 选项弹窗 STATIC/API 切换 + 远程数据源配置`

---

### Task 4: 文档 + 整构建

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** CLAUDE.md 动态表单段落「v1 未做」去掉 optionSource 远程；补一段远程数据源说明（optionSource STATIC/API、取值优先级、`${fieldId}` 占位 + 依赖重拉、码表预设、mapping 路径）。
- [ ] **Step 2:** `npm run build`（需 `HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890`）过 30/30。
- [ ] **Step 3:** Commit `docs: 远程数据源说明`

---

## 自测清单（控制器统一核对）

- [ ] 选项类字段配 API（码表预设，填 code），预览拉到码表选项渲染。
- [ ] params 配 `${fieldId}` 引用另一字段，改该字段值 → 远程选项自动重拉。
- [ ] 依赖字段未填 → 跳过请求，显手动 options 兜底。
- [ ] 远程拉到空数组 → 显「暂无可用选项」（不回退手动）；远程失败 → 回退手动 options。
- [ ] 级联字段配码表（带 children）→ 级联正常。
- [ ] optionSource 随 add/update/info 保存回显不丢。
- [ ] 查看数据/联动不受影响。

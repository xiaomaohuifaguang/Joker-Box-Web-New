# TABLE / DATERANGE 字段 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development。Steps use checkbox (`- [ ]`)。

**Goal:** 动态表单设计器新增两种字段类型：TABLE（动态表格，列定义 + 行对象数组值）和 DATERANGE（起止日期，可配日期/日期时间）。

**Architecture:** 沿用现有字段体系——`FIELD_REGISTRY` 注册两种类型 + 各自 Control；TABLE 列定义存字段 `tableColumns`，配置面板加列编辑器；DATERANGE 用 `props.withTime` 切换日期/日期时间。类型、校验、联动（条件值/OPTION 不涉及，VALUE 可赋值）、文档同步。

**Tech Stack:** Next.js 16 静态导出 + React 19 + TS strict + Tailwind v4 + shadcn/ui。

## Global Constraints

- 路径别名 `@/*` → 项目根；导入用 `@/...`，禁深相对 `../../`。
- TS strict，避免 `any`（`unknown` 用 `Array.isArray`/`typeof` 窄化）。
- react-hooks v7：不在 useEffect 里同步 setState，用 render 期守卫块。
- shadcn/ui 组件在 `@/components/ui/*`；图标 `lucide-react`。中文注释。
- 不引入新依赖（日期格式化用项目已有 `date-fns`）。
- 值结构（用户已定）：
  - **TABLE**：值 = `Record<列key, string>[]`（行对象数组）；单元格统一文本输入；列定义 `tableColumns: DynamicFormTableColumn[]`（`{key,title}`）存字段上，仅 TABLE 用。
  - **DATERANGE**：值 = `[start, end]`（两个 `'yyyy-MM-dd'` 或 `'yyyy-MM-dd HH:mm'` 字符串）；`props.withTime===true` 时含时间（默认 false 仅日期）。
- 后端契约：`List<DynamicFormTableColumn> tableColumns`，列 `{String key, String title}`。

---

### Task 1: 类型定义（DynamicFormTableColumn + tableColumns + 字段类型）

**Files:**
- Modify: `types/dynamic-form.ts`

**Interfaces:**
- Produces: `DynamicFormTableColumn { key: string; title: string }`；`DynamicFormFieldType` 增加 `"TABLE" | "DATERANGE"`；`DynamicFormField.tableColumns?: DynamicFormTableColumn[]`。

- [ ] **Step 1:** 在 `DynamicFormFieldType` 联合类型末尾（`"MULTICASCADER"` 后）加 `| "TABLE" | "DATERANGE"`。
- [ ] **Step 2:** 在 `DynamicFormOption` 之后新增：
```ts
// 动态表格列定义（仅 TABLE 类型字段使用）。
export interface DynamicFormTableColumn {
  key: string; // 列标识（存值用的键）
  title: string; // 列名（显示）
}
```
- [ ] **Step 3:** 在 `DynamicFormField` 接口加一行（放 `options?` 附近）：
```ts
  tableColumns?: DynamicFormTableColumn[]; // 动态表格列定义（仅 TABLE）
```
- [ ] **Step 4:** 更新文件头注释「第一版 15 种…TABLE/DATERANGE 后续」为「18 种」并去掉 TABLE/DATERANGE 待办表述。
- [ ] **Step 5:** `npx tsc --noEmit` 过。
- [ ] **Step 6:** Commit `feat: 类型加 TABLE/DATERANGE + DynamicFormTableColumn/tableColumns`

---

### Task 2: DATERANGE 控件 + 注册

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/fields/DateRangeControl.tsx`
- Modify: `app/console/form/dynamicForm-manager/_components/fields/registry.tsx`

**Interfaces:**
- Consumes: `FieldControlProps`（registry.tsx）、`createField`、`FIELD_REGISTRY`。
- Produces: `DateRangeControl`（default export named export），注册进 `FIELD_REGISTRY.DATERANGE`。

参考现有 `DateControl`（registry.tsx L268-314，Popover+Calendar，`format(d,"yyyy-MM-dd")`，DATETIME 加时间 Input）。`date-fns` 的 `format` 已用。

- [ ] **Step 1:** 写 `DateRangeControl.tsx`：
  - 值 = `[start, end]`（`string[]`，可为空数组/undefined）。`withTime = field.props?.withTime === true`。
  - UI：两个日期选择并排（开始/结束），各是 Popover+Calendar（复刻 DateControl 模式），中间 `~` 或 `至` 分隔；withTime 时每个日历下方加 `type="time"` Input。
  - 格式：date-only `yyyy-MM-dd`；withTime `yyyy-MM-dd HH:mm`。
  - 结束日期 < 开始日期时不强制（或由 onChange 自然存），校验在 Task 4 处理。
  - 用 `Clearable` 包外层（有值显 × 清空 onChange(undefined)）。
  - TS strict：`value` 用 `Array.isArray(value) ? (value as string[]) : []` 取出 start/end。
- [ ] **Step 2:** registry.tsx 导入并注册：
```ts
DATERANGE: {
  type: "DATERANGE",
  label: "日期范围",
  group: "日期时间",
  defaults: () => ({ props: { withTime: false } }),
  Control: DateRangeControl,
},
```
（无 placeholder/options/length/minmax/pattern 标记。）
- [ ] **Step 3:** `npx tsc --noEmit` 过；`npx eslint` 这两文件过。
- [ ] **Step 4:** Commit `feat: DATERANGE 控件 + 注册`

---

### Task 3: TABLE 控件 + 列编辑器 + 注册

**Files:**
- Create: `app/console/form/dynamicForm-manager/_components/fields/TableControl.tsx`
- Modify: `app/console/form/dynamicForm-manager/_components/fields/registry.tsx`

**Interfaces:**
- Consumes: `FieldControlProps`、`DynamicFormTableColumn`。
- Produces: `TableControl`；注册进 `FIELD_REGISTRY.TABLE`。

- [ ] **Step 1:** 写 `TableControl.tsx`：
  - 值 = `Record<string, string>[]`（行数组）。`rows = Array.isArray(value) ? (value as Record<string,string>[]) : []`。
  - 列 = `field.tableColumns ?? []`。
  - 渲染：表头（各列 title）+ 行（每行每列一个 `<Input>`，值 `rows[r][col.key] ?? ""`）+ 每行删除按钮 + 底部「+ 添加行」。
  - 无列时：提示「请先在字段配置添加表格列」（预览里设计器没配列的兜底）。
  - 添加行：新行 = 每列 key 初始 `""` 的对象。
  - 编辑单元格：`onChange(rows.map((row,i) => i===r ? {...row, [col.key]: v} : row))`。
  - 删除行：`onChange(rows.filter((_,i)=>i!==r))`。
  - 表格用 `<table>` 或 div 网格，横向溢出 `overflow-x-auto`。disabled 透传。
  - 样式对齐项目 token（`border`/`rounded-md`/`bg-background` 等）。
- [ ] **Step 2:** registry.tsx 导入并注册：
```ts
TABLE: {
  type: "TABLE",
  label: "动态表格",
  group: "高级",
  defaults: () => ({ tableColumns: [] }),
  Control: TableControl,
},
```
- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint` 过。
- [ ] **Step 4:** Commit `feat: TABLE 控件 + 注册`

---

### Task 4: 配置面板（TABLE 列编辑器 + DATERANGE withTime 开关 + 默认值处理）

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/FieldConfigPanel.tsx`

**Interfaces:**
- Consumes: `DynamicFormTableColumn`、`isCascader`/`isUpload` 现有模式、`OptionsDialog` 弹窗模式（参考其「按钮+宽Dialog」结构）。

- [ ] **Step 1:** 加 `isTable`/`isDateRange` 常量（`field.type === "TABLE"` / `"DATERANGE"`）。
- [ ] **Step 2:** TABLE 列编辑器：新增 `TableColumnsDialog`（仿 `OptionsDialog` 壳：按钮 + 宽 Dialog），内部列编辑列表——每列 `key`（mono Input）+ `title`（Input）+ 删除，底部「+ 添加列」。key 默认 `col_${crypto.randomUUID().slice(0,6)}` 或 `col${n}`。在配置面板 `{isTable && (<Field label="表格列"><TableColumnsDialog .../></Field>)}` 渲染，`onChange={(tableColumns)=>onChange({tableColumns})}`。
- [ ] **Step 3:** DATERANGE 的 withTime 开关：仿 `checkStrictly`（isCascader 那个 Switch 块）。`{isDateRange && (<Field label="包含时间"><Switch checked={field.props?.withTime===true} onCheckedChange={(c)=>onChange({props:{...field.props,withTime:c}})} /> + 说明文本)}`。
- [ ] **Step 4:** 默认值处理（`DefaultValueEditor`）：
  - TABLE：默认值无意义（设计器里预填表格行不合理）→ 显示「动态表格不支持默认值」（仿 UPLOAD 分支）。
  - DATERANGE：默认值用 `DateRangeControl` 渲染（自然落入底部 `Control` 通用分支即可，无需特判）。
  - 注意：`DefaultValueEditor` 顶部对 UPLOAD 有特判，给 TABLE 也加类似特判。
- [ ] **Step 5:** `npx tsc --noEmit` + `npx eslint` 过。
- [ ] **Step 6:** Commit `feat: 配置面板 TABLE列编辑 + DATERANGE withTime + 默认值处理`

---

### Task 5: 校验 + 联动/预览兼容

**Files:**
- Modify: `app/console/form/dynamicForm-manager/_components/validate.ts`
- Modify: `app/console/form/dynamicForm-manager/_components/LinkageRuleEditor.tsx`（conditionsOf 操作符，若需要）

**Interfaces:**
- Consumes: `validateField`、`conditionsOf`。

- [ ] **Step 1:** validate.ts：
  - DATERANGE：必填校验沿用（空数组/undefined 视为空，现有 isEmpty 已覆盖数组）。加自定义校验：若值是 `[start,end]` 且两者都有且 `end < start`（字符串比较，格式固定即可比），返回「{title}结束日期不能早于开始日期」。在 `validateField` 末尾 return null 前加一段 `if (field.type === "DATERANGE" && Array.isArray(value) ...)`。
  - TABLE：必填校验沿用（空数组=空）。可选：行内所有单元格都空的行不算有效行（YAGNI，可不做；至少保证必填时「有任意一行」即可，现有 isEmpty 数组判空已够）。**保持最小**：TABLE 不加额外校验。
- [ ] **Step 2:** 联动 conditionsOf：TABLE/DATERANGE 走默认分支（`["EQ","NE","REGEX","EMPTY","NOT_EMPTY"]`）对它们不合适——数组值 EQ 用 `fieldVal.includes(target)` 意义不明。给这两种类型定操作符：`["EMPTY","NOT_EMPTY"]`（表格/范围用「是否填写」最实用）。在 `conditionsOf` 加分支：
```ts
if (t === "TABLE" || t === "DATERANGE") return ["EMPTY", "NOT_EMPTY"];
```
（VALUE/SHOW/HIDE/REQUIRED/DISABLED/ENABLED 对这俩仍可用；OPTION/SET_PATTERN 无意义但用户不会配。）
- [ ] **Step 3:** 预览确认：FormPreviewDialog 渲染走 `FIELD_REGISTRY[type].Control`，TABLE/DATERANGE 自动可用（无需改）；`computeFieldState`/`visibleOptions` 不涉及这两类（非选项类）。检查 `PreviewField` 的 `meta.Control` 调用对 TABLE 宽控件，`span` 生效即可。
- [ ] **Step 4:** `npx tsc --noEmit` + `npx eslint` 过。
- [ ] **Step 5:** Commit `feat: TABLE/DATERANGE 校验 + 联动操作符`

---

### Task 6: 文档 + 整构建

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** CLAUDE.md 动态表单设计器段落：字段类型列表加 TABLE/DATERANGE（「18 类型」→「20 类型」）；「v1 未做」列表去掉 TABLE/DATERANGE；补一段两种字段的说明（TABLE 列定义 tableColumns + 行对象数组值 + 单元格文本；DATERANGE props.withTime + [start,end] 值）。
- [ ] **Step 2:** `npm run build`（需 `HTTPS_PROXY=http://127.0.0.1:7890 HTTP_PROXY=http://127.0.0.1:7890`）过 30/30 路由。
- [ ] **Step 3:** Commit `docs: TABLE/DATERANGE 字段说明`

---

## 自测清单（控制器统一核对）

- [ ] 新建 DATERANGE 字段，配置面板有「包含时间」开关；预览可选起止日期，withTime 时带时间；结束<开始有校验提示。
- [ ] 新建 TABLE 字段，配置面板可增删列（key/title）；预览可增删行、填单元格；必填校验空表格报错。
- [ ] 两种字段进「查看数据」JSON：TABLE=`[{col:v,...}]`，DATERANGE=`[s,e]`。
- [ ] 联动：TABLE/DATERANGE 可作 SHOW/HIDE/REQUIRED 目标；作触发字段时操作符仅 EMPTY/NOT_EMPTY。
- [ ] 保存/回显：tableColumns、withTime 随 add/update/info 往返不丢。

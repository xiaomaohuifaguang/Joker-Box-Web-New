# form/dynamicForm-manager — 动态表单设计器

最复杂的后台模块（`<RequireAdmin>`）。两视图（state 驱动 + pushState，同 ganDaShi 模式，见 CLAUDE.md「通用坑」）：**列表** `?` 无参（`FormListPanel`）/ **设计器** `?design=id|new` / **只读查看** `?view=id&version=v`（`FormDesigner`）。

## 结构
- `page.tsx`：视图路由（`parseView` 解析 `design`/`view`/`version` query，`popstate` 同步）。
- `FormListPanel`：搜索+分页+表格+CRUD，操作列按 status 开放。
- `FormDesigner`：设计器/只读查看。h1 + 三栏（字段库 `FieldPalette` | 画布 `FormCanvas` | 配置 `FieldConfigPanel`/`LinkagePanel` Tab）+ 顶栏（版本切换/预览/保存）。
- `designer-state.ts`：`useDesignerState` 管 fields/groups/linkageRules（**纯客户端 state，仅「保存」落库**）；`stateFromForm`/`toPayload`（存前剥 clientId）、`UNGROUPED_ID`、`groupKey`、`ruleReferencesField`。fieldId=`crypto.randomUUID()`。
- `DynamicFormRenderer.tsx`：填写态渲染引擎（受控 forwardRef）。从 `FormPreviewDialog` 抽出——取值/联动求值(`computeFieldState`)/远程选项(`useRemoteOptions`)/校验(`validate`)/收集(`collectData`)/VALUE 边沿 + 24 栅格 + 分组折叠。props `{fields,groups,linkageRules,values,errors,onChange}`，handle `{validate,collectData,clearEdgeTriggers}`。**预览（FormPreviewDialog 薄壳）与前台 `/dynamicForm` 共用——跨模块共享件，前台直接 import，勿复制引擎。**
- `fields/registry.tsx`：`FIELD_REGISTRY`（19 类型四组，Record<type, FieldMeta{type/label/group/defaults/Control/hasOptions/hasLength/hasMinMax/hasPattern/hasPlaceholder}>）+ `createField(type,sort)`；`fields/` 各自写控件。
- `linkage.ts`：联动求值引擎；`optionSource.ts` + `useRemoteOptions.ts`：远程数据源；`validate.ts`：预览提交校验。
- `FormPreviewDialog`/`OptionsEditor`/`LinkagePanel`/`LinkageRuleEditor`/`GroupSection`。

## 字段与画布
- **字段库**：19 类型分四组（基础/选择/日期时间/高级）：INPUT/TEXTAREA/NUMBER/SWITCH/SLIDER/RATE/COLOR/SELECT/MULTISELECT/RADIO/CHECKBOX/DATE/TIME/DATETIME/DATERANGE/UPLOAD/CASCADER/MULTICASCADER/TABLE。**DATERANGE**：值=`[start,end]` 字符串数组，`props.withTime` 切 date-only/含时间，`DateRangeControl` 双日历+「至」，校验 end<start。**TABLE**：值=`Record<列key,string>[]` 行对象数组，列定义存 `columns`（`TableColumnsDialog` 增删列+key去重），联动操作符仅 EMPTY/NOT_EMPTY。
- **画布**：24 栅格（`grid-cols-[repeat(24,...)]` + `gridColumn: span X`），@dnd-kit **跨组拖拽排序/改挂**（多 SortableContext 容器 + `UNGROUPED_ID`，未分组恒在分组上方），`GroupSection` 可折叠/改名/删除（删组字段回未分组）。gap 用固定 8px 与主题 spacing 解耦（Minimal 下两 span=12 可同行）。
- **配置面板**：按类型动态显通用/校验属性 + 选项编辑 + 默认值（复用该字段 Control 编辑）。选项统一**弹窗编辑**（`OptionsDialog`，级联带嵌套子级）；级联默认值走宽 Dialog 内联面板。选项 `visible?: boolean`（默认 true，false 预览/填表隐藏，`visibleOptions()` 统一过滤；**隐藏不删已选值**）。
- **控件**（`fields/`）：`UploadControl`（值存 FileInfo/FileInfo[]，`max`=数量上限）；`CascaderControl`/`MultiCascaderControl`（值=路径数组/二维路径数组，`props.checkStrictly` true=任选层级/false=仅叶子；点 label 展开 + 圆圈选中）；`MultiSelectControl`（真下拉多选，区别于 CHECKBOX 平铺组）。三者下拉**内联绝对定位面板（不 portal）**——滚轮被挡见「通用坑」。
- **清空按钮统一方案**：可清空控件末尾位互斥——有值显 ×（点击清空）/ 无值显 chevron（`Clearable` 包 shadcn 控件；级联/多选自写控件三元切换）；SELECT 隐藏 Radix 自带 chevron 自绘互斥；原生 input 自带清除不加。
- **空选项**：`visibleOptions()` 过滤后为空显「暂无可用选项」。SelectControl 用 `position="popper"`（见「通用坑」）。
- **预览**（`FormPreviewDialog`，`sm:max-w-6xl`）：按 24 栅格渲染真实控件，分组可折叠（组内有错强制展开），提交校验（`validate.ts`），重置。「查看数据」嵌套 Dialog 显 fieldId→当前值 JSON（含未改默认值，跳过空值）+ 复制。

## 生命周期（status：0 草稿 / 1 发布 / -1 停用）
- **生命周期接口**：`/dynamicForm/*` 全 POST body（CRUD/详情），但**发布/停用/已发布版本（`deploy`/`stop`/`publishedForms`）是 POST 却用 query 传 `formId`**（反直觉，别写成 body）。`publishedForms` 的 data 是**按 formId 聚合的 List**（非单对象），取 `formId` 匹配当前表的那条（兜底 `list[0]`）。`info` 不传 version 默认 DRAFT。文件上传/下载走 `/file/*`（`lib/api/dynamicFormFile.ts`）。
- **列表操作列按状态开放**（`FormListPanel`，AlertDialog 二次确认）：草稿`0`=编辑/删除/发布；已发布`1`=查看/停用；停用`-1`=编辑/发布。
- **发布态只读查看**：`?view=id&version=v` 进 `FormDesigner readOnly`（`info` 带 version，省略默认 DRAFT）。实现=隐藏保存 + 名称/描述 Input disabled + 字段库/画布 `pointer-events-none` + 配置面板 `<fieldset disabled>`（禁控件保留滚动）。**designer 所有变更都是纯客户端 state、仅「保存」落库，只读不显示保存 → 不可能污染后端**，故无需阻断滚动。
- **编辑页版本切换**：`publishedForms` 拉历史版本；草稿/停用编辑态（非只读、有 id、有历史版本）显版本 Select（当前草稿=不传 version + 各发布版本）。切换=改 `viewVersion` state 复用加载 effect 重拉 `info(id, version)` 渲染字段+联动（纯加载参考）；**「保存」始终 `update(id)` 覆盖草稿**，与查看版本无关。切换器用 `switching` flag（事件置 true/effect 完成置 false）——set-state-in-effect 见「通用坑」。

## 联动规则（linkageRules 随 add/update/info 走）
**任意嵌套条件树**（AND/OR 节点的 children 可含 CONDITION 或子 AND/OR 组，嵌套 children 不读 id/parentId，后端自动算 id）。9 动作 SHOW/HIDE/REQUIRED/OPTION/VALUE/DISABLED/ENABLED/SET_PATTERN/SET_SPAN，**条件满足才执行、不满足一律回字段原配置**（SHOW/HIDE 不反义）。字段有 `visible` 属性（默认 true，「默认显示」开关）：false=默认隐藏，配合 SHOW 满足才显示。求值引擎 `linkage.ts`（`evalCondition`/`evalNode` 递归、`evalRule`、`computeFieldState` 纯函数，初始 visible 取字段配置）；预览每字段过 `computeFieldState` 得有效状态，隐藏/禁用字段保留值、不校验、不进查看数据；VALUE 边沿触发赋一次（ref 记上次条件结果）。**OPTION 动作=全量替换**：`actionValue` 存完整选项树（字段配置副本，每项带 visible），命中时 `state.options=actionValue` 整体替换，渲染仍走 `visibleOptions()`。编辑 UI=右侧「字段配置|联动规则」Tab（`LinkagePanel` 卡片列表+上下移+启停）+ 宽弹窗 `LinkageRuleEditor`（递归 ConditionGroupNode 条件树；**条件值复用触发字段真实控件**——借 createField 造临时字段；自引用保存时 toast 阻止）。**删字段级联删引用规则**（`removeField` 过滤 `linkageRules`）；**选项变更自动同步规则**（`updateField` 检测 options 变化走 `syncRulesOnOptionsChange`）；**VALUE 循环赋值熔断**（连续 ≥10 次停止 + toast）。

## 远程数据源（optionSource 随 add/update/info 走）
选项类字段（SELECT/MULTISELECT/RADIO/CHECKBOX/CASCADER/MULTICASCADER）的 options 可改为运行时从 /joker-box 接口拉取。`optionSource{type:"STATIC"|"API",url,method,params,mapping}`。**取值优先级（已去手动兜底）**：`type==="API"` 完全以远程为准——成功（含空数组）用远程结果；失败/异常控件占位显「数据源异常」（禁用，不校验、不进查看数据）；加载中/依赖未填/地址非法显「加载中…」。**均不回退手动 options**。`params` value 支持 **`${fieldId}` 占位**（运行时取该字段当前值替换，依赖变化自动重拉，依赖有空值跳过请求）。`mapping{listPath,labelPath,valuePath,childrenPath}`：`$`=lib/api 剥过的 data 本身，留空走默认 label/value/children，children 递归（级联），支持 `$.data`。`useRemoteOptions` 预览拉取（请求 key=url+method+替换后参数，竞态守卫，url 仅允许 `/` 开头不含 `://`）；数据源状态经 `field.props.__sourceError/__sourceLoading`（运行时注入、保存前 `stripClient` 剥离）传给控件。**默认值编辑器跟随数据源**：API 字段恒显只读提示（设计态拉不到远程选项）。**数据源变化清理联动规则（二级确认）**：`optionSource` 实质变化（手动↔远程切换 / url/method/params/mapping 改）清空涉及该字段的规则，清前弹 AlertDialog。远程选项**不进**联动规则配置（条件值/VALUE/OPTION 仍用手动 `options`）。**码表作 API 预设**：切到 API 默认填码表预设（`url=/code-table/options,method=GET,params={code:""},mapping={listPath:"$.data"}`，用户补 code）。

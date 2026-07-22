# 动态表单设计器 — 联动规则（Linkage Rules）设计

日期：2026-07-23
状态：已确认（用户逐块确认 + UI 形式确认）

## 背景

动态表单设计器（`/console/form/dynamicForm-manager`）已有 18 种字段、跨组拖拽、选项 visible、预览校验。本版加**联动规则**：字段值满足条件时，动态改变其他字段的显隐/必填/选项/值/正则/宽度/禁用。

后端契约已定（add/update/info 的 `data.linkageRules`），前端按此对齐。

## 已确认决策

| 决策点 | 结论 |
|---|---|
| 联动效果范围 | 条件显隐、选项联动、条件必填、条件赋值，以及改正则/宽度等任意属性 |
| 条件组合 | **扁平条件组**：1 个 AND/OR 根 + N 个 CONDITION 子节点（不做任意嵌套 UI） |
| 隐藏/禁用字段行为 | **保留值、不校验、不进「查看数据」**；重新显示时值还在 |
| conditionTree 关联 | **嵌套 children**（不管 id/parentId，后端自动算 id） |
| 条件不满足时 | **不做任何动作**，字段按原配置渲染 |
| VALUE 赋值时机 | **仅触发瞬间赋一次**（条件由不满足→满足的边沿触发），非持续监听 |
| 编辑 UI | **右侧 Tab 列表 + 宽弹窗编辑** |

## 1. 数据模型（types/dynamic-form.ts）

```ts
export type DynamicFormLinkageActionType =
  | "SHOW" | "HIDE" | "REQUIRED" | "OPTION" | "VALUE"
  | "DISABLED" | "ENABLED" | "SET_PATTERN" | "SET_SPAN";

export type DynamicFormLinkageCondition =
  | "EQ" | "NE" | "GT" | "LT" | "GE" | "LE"
  | "IN" | "NOT_IN" | "EMPTY" | "NOT_EMPTY" | "REGEX";

export interface DynamicFormLinkageNode {
  id?: string;                       // 后端返回（编辑回显）
  nodeType: "AND" | "OR" | "CONDITION";
  triggerFieldId?: string;           // 仅 CONDITION
  triggerCondition?: DynamicFormLinkageCondition; // 仅 CONDITION
  triggerValue?: unknown;            // 仅 CONDITION
  sortOrder?: number;
  children?: DynamicFormLinkageNode[];
  // parentId 不需要：嵌套 children 表达层级，后端自动算 id
}

export interface DynamicFormLinkageRule {
  id?: string;                       // 后端返回
  name: string;
  targetFieldId: string;
  actionType: DynamicFormLinkageActionType;
  actionValue?: unknown;             // 见动作语义表
  enable: boolean;                   // true=启用 / false=禁用
  sortOrder?: number;
  conditionTree: DynamicFormLinkageNode[]; // 扁平：[AND/OR根]，根.children=[CONDITION...]
}
```

`DynamicForm` / `DynamicFormSavePayload` 增加 `linkageRules?: DynamicFormLinkageRule[]`。

**扁平规则存储形态**：`conditionTree = [{ nodeType:"AND"|"OR", children:[{nodeType:"CONDITION",...}, ...] }]`。无条件（children 空）视为「恒真」。

## 2. 动作语义（运行时生效方式）

| actionType | 条件满足时 | actionValue |
|---|---|---|
| SHOW | 目标显示（不满足→隐藏） | — |
| HIDE | 目标隐藏（不满足→显示） | — |
| REQUIRED | 目标必填（不满足→按原 required） | — |
| DISABLED | 目标禁用（不满足→按原） | — |
| ENABLED | 目标启用（不满足→按原，用于反转默认禁用） | — |
| VALUE | 目标赋值（**仅触发瞬间赋一次**） | 值 |
| OPTION | 用 actionValue 替换目标 options | `DynamicFormOption[]` |
| SET_PATTERN | 改目标正则 | 正则串 |
| SET_SPAN | 改目标宽度 | 1-24 数字 |

**核心语义**：条件满足才执行动作；**不满足时字段回到原始配置**（SHOW/HIDE 例外——它们互为反义，SHOW 不满足=隐藏、HIDE 不满足=显示）。

**冲突**：同字段多规则按 `sortOrder` 顺序求值，后命中覆盖先命中；`enable=false` 跳过。

## 3. 求值引擎（_components/linkage.ts，纯函数可测）

- `evalCondition(node, values): boolean` — CONDITION 按操作符求值。
  - EQ/NE：值相等（数组字段=包含该值）
  - GT/LT/GE/LE：数值比较
  - IN/NOT_IN：triggerValue 数组与字段值相交（字段值数组或单值）
  - EMPTY/NOT_EMPTY：空串/空数组/null/undefined
  - REGEX：正则匹配字段字符串值
- `evalRule(rule, values): boolean` — 根 AND（全真）/OR（任一真）聚合 children；空 children=恒真。
- `computeFieldState(field, rules, values): FieldState` — 汇总所有 enable 且作用于该 fieldId 的规则，叠加出最终：
  `{ visible, required, disabled, options, pattern, span }`，未命中项取字段原配置。
- `collectValueRules(rules): 按 targetFieldId 分组的 VALUE 规则` — 供触发瞬间赋值。

## 4. 预览运行时（FormPreviewDialog）

- 渲染每个字段前过 `computeFieldState`：`visible=false` 不渲染；`disabled` 透传 Control；`required` 合并校验；`options/pattern/span` 覆盖字段属性。
- **值校验**：`validate.ts` 的 `validateField` 接受「有效字段状态」，隐藏/禁用字段跳过 required 校验；REQUIRED 命中字段参与必填；SET_PATTERN 命中按新正则校验。
- **查看数据**：隐藏/禁用字段不进 JSON（保留内存值）。
- **VALUE 触发**：监听 values 变化，对每个 VALUE 规则记录上次条件结果；**边沿检测**——上次不满足、本次满足时，调 `setValue(targetFieldId, actionValue)` 赋一次。用 ref 存上次结果避免重复赋。

## 5. 编辑 UI（设计器）

### 布局
- 设计器右侧/顶部加 Tab：「字段配置 | 联动规则」（字段配置=现有 FieldConfigPanel）。
- 「联动规则」Tab = 规则管理面板：规则卡片列表（名称 + 「若…→动作 目标」可读摘要 + 启用开关 + 拖拽排序 + 编辑/删除）+ [+ 新建规则]。
- 点新建/编辑 → **宽弹窗**（`sm:max-w-3xl`）规则编辑器。

### 规则编辑器（LinkageRuleEditor 弹窗）
- **规则名称**：文本输入。
- **条件区**：AND/OR 切换（Select：全部满足/任一满足）+ 条件行列表 + [+ 添加条件]。
  - 条件行：触发字段下拉（只列**其他字段**，显示标题+fieldId）+ 操作符下拉（**按触发字段类型过滤**：数字才有 GT/LT/GE/LE，文本才有 REGEX，选项类才有 IN/NOT_IN，EMPTY/NOT_EMPTY 通用）+ 值输入（**按触发字段类型渲染对应控件**：RADIO/SELECT→选项下拉、NUMBER→数字、DATE→日期…；EMPTY/NOT_EMPTY 无值输入）+ 删除。
- **动作区**：目标字段下拉（只列其他字段）+ 动作类型下拉 + 动作参数（按动作类型动态出现：VALUE→目标字段类型控件、OPTION→OptionsEditor、SET_PATTERN→文本、SET_SPAN→slider 1-24，其余无）。
- 保存校验：名称必填、目标字段必选、至少一个有效条件（或允许空=恒真，提示）。

### 组件拆分
- `_components/linkage.ts` — 求值引擎（纯函数）。
- `_components/LinkagePanel.tsx` — 右侧 Tab 规则列表（卡片 + 排序 + 启删）。
- `_components/LinkageRuleEditor.tsx` — 宽弹窗编辑器（条件区 + 动作区）。
- `designer-state.ts` — `useDesignerState` 加 linkageRules 状态：addRule/updateRule/removeRule/moveRule，reset/toPayload 带上 linkageRules。
- `FormDesigner.tsx` — Tab 容器，字段配置/联动规则切换。
- `FormPreviewDialog.tsx` — 接入 computeFieldState + VALUE 触发 + 查看数据过滤。
- `validate.ts` — 接受有效字段状态。

## 6. 接口

复用现有 `/dynamicForm/{queryPage,info,add,update,remove}`，`linkageRules` 随 payload/详情 data 走。无需新接口。

## 不做（YAGNI）
- 任意嵌套条件树 UI（扁平条件组已覆盖，conditionTree 结构仍兼容未来扩展）。
- 跨表单联动、服务端联动求值、联动规则调试器/日志。

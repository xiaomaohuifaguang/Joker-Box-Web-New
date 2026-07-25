// 动态表单（/dynamicForm/*）类型定义。第一版：基础字段 + 未分组/分组，不含发布/版本/联动/远程数据源。

// 字段类型（19 种）。
export type DynamicFormFieldType =
  | "INPUT"
  | "TEXTAREA"
  | "NUMBER"
  | "SELECT"
  | "MULTISELECT"
  | "RADIO"
  | "CHECKBOX"
  | "SWITCH"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "SLIDER"
  | "RATE"
  | "COLOR"
  | "UPLOAD"
  | "CASCADER"
  | "MULTICASCADER"
  | "TABLE"
  | "DATERANGE";

// 选项（label/value，children 预留给级联，第一版平铺不用）。visible=false 时该选项在预览/填表时隐藏（默认 true）。
export interface DynamicFormOption {
  label: string;
  value: string;
  visible?: boolean;
  children?: DynamicFormOption[];
}

// 远程选项的字段映射路径（点路径，如 "data.list"；不填走默认 label/value/children）。
export interface DynamicFormOptionMapping {
  listPath?: string; // 选项数组所在路径（响应整体或数组本身时可省略）
  labelPath?: string; // 显示文案路径（默认 "label"）
  valuePath?: string; // 值路径（默认 "value"）
  childrenPath?: string; // 子选项路径（默认 "children"，级联递归用）
}

// 选项数据源：STATIC=手工录入的 options；API=远程拉取（params 支持 ${fieldId} 占位联动）。
export interface DynamicFormOptionSource {
  type: "STATIC" | "API";
  url?: string; // API 必填
  method?: "GET" | "POST"; // 默认 POST
  params?: Record<string, unknown>; // 请求参数，value 支持 ${fieldId} 占位
  mapping?: DynamicFormOptionMapping; // 响应映射
}

// 动态表格列定义（仅 TABLE 类型字段使用）。
export interface DynamicFormTableColumn {
  key: string; // 列标识（存值用的键）
  title: string; // 列名（显示）
}

// 上传文件信息（/file/uploadDynamicForm 响应 data）。UPLOAD 字段值存整个 FileInfo 对象（单文件）
// 或 FileInfo[]（多文件，max 控数量）。
export interface FileInfo {
  id: string;
  contentType?: string;
  filename?: string;
  createTime?: string;
}

// 表单项。defaultValue 类型随 type 变（见设计器 defaultValue 约定）。
export interface DynamicFormField {
  fieldId: string; // 前端设计 id
  title: string;
  type: DynamicFormFieldType;
  required?: string; // "1" / "0"
  visible?: boolean; // 字段默认可见（默认 true）。false=默认隐藏，配合联动 SHOW 满足时才显示
  defaultValue?: unknown;
  placeholder?: string;
  options?: DynamicFormOption[]; // 单选/多选用
  optionSource?: DynamicFormOptionSource; // 选项数据源（STATIC=用 options / API=远程拉取）
  tableColumns?: DynamicFormTableColumn[]; // 动态表格列定义（仅 TABLE）
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternTips?: string;
  span?: number; // 1-24，默认 24
  sort?: number;
  // 组件额外配置。已知键：showAllOptions（联动 VALUE/条件值列全部选项，含 visible=false）、
  // withTime（DATERANGE 含时间）、checkStrictly（级联任选层级）。
  // 运行时键（仅预览注入、保存前剥离，不进后端）：__sourceError / __sourceLoading（API 选项数据源状态）。
  props?: Record<string, unknown>;
  id?: string; // 后端返回的表单项 id（编辑回显）
}

// 字段分组。
export interface DynamicFormFieldGroup {
  name: string;
  description?: string;
  sort?: number; // 越小越靠前
  collapsed?: string; // "0" 展开 / "1" 折叠
  fields: DynamicFormField[];
  id?: string; // 后端返回的分组 id
  // 前端临时 id（新建分组保存前用），不参与提交。
  clientId?: string;
}

// 表单（列表/详情）。
export interface DynamicForm {
  id?: string;
  name: string;
  description?: string;
  version?: string;
  status?: string; // "0" 草稿 / "1" 发布 / "-1" 停用
  linkageRules?: DynamicFormLinkageRule[]; // 联动规则
  fields?: DynamicFormField[]; // 未分组字段
  groups?: DynamicFormFieldGroup[];
  createTime?: string;
  updateTime?: string;
}

// 保存 payload（add 无 id，update 有 id）。
export interface DynamicFormSavePayload {
  id?: string;
  name: string;
  description?: string;
  fields: DynamicFormField[];
  groups: DynamicFormFieldGroup[];
  linkageRules?: DynamicFormLinkageRule[]; // 联动规则
}

// 分页查询参数。
export interface DynamicFormPageParam {
  search?: string;
  current: number;
  size: number;
}

// 已发布版本（/dynamicForm/publishedForms 的 data）。含历史版本，编辑页版本切换用。
export interface DynamicFormPublishedVersion {
  formId?: string; // 该版本所属表单 id（与 formName 同级返回，可校验是否对应当前编辑的表）
  formName?: string;
  latestVersion?: string; // 最新发布版本号
  versions?: DynamicFormVersion[];
}

export interface DynamicFormVersion {
  version?: string;
  publishTime?: string;
}

// ---- 联动规则（linkageRules，add/update/info 的 data 内）----

// 动作类型。
export type DynamicFormLinkageActionType =
  | "SHOW" // 显示（不满足→隐藏）
  | "HIDE" // 隐藏（不满足→显示）
  | "REQUIRED" // 必填（不满足→按原 required）
  | "OPTION" // 设置选项
  | "VALUE" // 设置值（仅触发瞬间赋一次）
  | "DISABLED" // 禁用
  | "ENABLED" // 启用
  | "SET_PATTERN" // 设置正则
  | "SET_SPAN"; // 设置宽度

// 条件操作符。
export type DynamicFormLinkageCondition =
  | "EQ" | "NE" // 等于/不等于（数组字段=包含）
  | "GT" | "LT" | "GE" | "LE" // 数值比较
  | "IN" | "NOT_IN" // 值在/不在 triggerValue 数组内
  | "EMPTY" | "NOT_EMPTY" // 为空/非空
  | "REGEX"; // 正则匹配

// 条件节点。任意嵌套：AND/OR 节点的 children 可含 CONDITION 或子 AND/OR 组（不读 id/parentId，后端自动算 id）。
export interface DynamicFormLinkageNode {
  id?: string; // 后端返回（编辑回显原样带回）
  nodeType: "AND" | "OR" | "CONDITION";
  triggerFieldId?: string; // 仅 CONDITION
  triggerCondition?: DynamicFormLinkageCondition; // 仅 CONDITION
  triggerValue?: unknown; // 仅 CONDITION（IN/NOT_IN 为数组）
  sortOrder?: number;
  children?: DynamicFormLinkageNode[];
}

// 联动规则。
export interface DynamicFormLinkageRule {
  id?: string; // 后端返回
  name: string;
  targetFieldId: string;
  actionType: DynamicFormLinkageActionType;
  actionValue?: unknown; // OPTION=完整选项树 DynamicFormOption[](命中整体替换，每项带 visible) / VALUE=值 / SET_PATTERN=正则串 / SET_SPAN=1-24
  enable: boolean; // true=启用 / false=禁用
  sortOrder?: number;
  conditionTree: DynamicFormLinkageNode[]; // [AND/OR根]，根.children 可嵌套子组
}

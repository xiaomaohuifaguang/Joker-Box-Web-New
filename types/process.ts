import type { DynamicForm, DynamicFormField, DynamicFormFieldGroup } from "./dynamic-form";

// 流程引擎（/processDefinition/*）类型定义。第一版：流程定义分页列表。

// 流程定义（流程模板）。status：0 草稿 / 1 已发布 / -1 已停用。
export interface ProcessDefinition {
  /** 流程id */
  id?: number;
  /** 流程定义key */
  processKey?: string;
  /** 流程分类 */
  processCategory?: string;
  /** 流程定义名称 */
  processName?: string;
  /** 流程描述 */
  processDescription?: string;
  /** 当前版本 */
  version?: string;
  /** 状态：0 草稿 / 1 已发布 / -1 已停用 */
  status?: string;
  /** 画布数据（仅详情返回；React Flow 图 JSON {nodes, edges}） */
  rawData?: ProcessRawData;
  /** 全局表单绑定（与 processName 同级） */
  globalFormBinding?: ProcessDefinitionForm;
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime?: string;
  /** 更新时间（yyyy-MM-dd HH:mm:ss） */
  updateTime?: string;
}

// 分页查询参数（POST /processDefinition/queryPage body）。
export interface ProcessDefinitionPageParam {
  /** 页大小 */
  size: number;
  /** 当前页码 */
  current: number;
  /** 搜索（流程名称，可空） */
  search?: string;
}

// 流程表单绑定（globalFormBinding）：流程级绑定的动态表单 + 版本。
export interface ProcessDefinitionForm {
  /** 表单ID */
  formId?: string;
  /** 绑定的表单版本号 */
  formVersion?: string;
}

// 节点字段权限（node.data.fieldPermissions 元素）。仅收录非默认权限，默认 VISIBLE 不入库。
export interface ProcessNodeFieldPermission {
  /** 对应字段的 fieldId */
  fieldKey: string;
  /** 权限：READONLY 只读 / HIDDEN 隐藏 / REQUIRED 必填（默认 VISIBLE 可见，不收录） */
  permission: "READONLY" | "HIDDEN" | "REQUIRED";
}

// 画布数据（ProcessDefinition.rawData）。React Flow 标准图 JSON，后端据此转 BPMN。
// nodes[].type 即 BPMN 元素名（startEvent/serviceTask/...），属性在 nodes[].data。
export interface ProcessRawData {
  /** 节点（React Flow Node 数组） */
  nodes?: unknown[];
  /** 连线（React Flow Edge 数组） */
  edges?: unknown[];
  /** 视口（缩放/平移，可选，回填还原视角用） */
  viewport?: { x: number; y: number; zoom: number };
  [key: string]: unknown;
}

// 新建草稿请求体（POST /processDefinition/add）。响应只看 code。
export interface ProcessDefinitionAddPayload {
  /** 流程分类 */
  processCategory?: string;
  /** 流程定义名称 */
  processName?: string;
  /** 流程描述 */
  processDescription?: string;
  /** 画布数据 */
  rawData?: ProcessRawData;
  /** 全局表单绑定 */
  globalFormBinding?: ProcessDefinitionForm;
}

// 保存修改请求体（POST /processDefinition/save）。比 add 多 id。响应只看 code。
export interface ProcessDefinitionSavePayload extends ProcessDefinitionAddPayload {
  /** 流程id */
  id: number;
}

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

// 流程实例（/processInstance/queryPage 元素）。processStatus：0 草稿 / 10 已完成 / 11 已终止 / 其他 审批中。
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
  /** 流程状态：0 草稿 / 10 已完成 / 11 已终止 / 其他 审批中 */
  processStatus?: string;
  /** 当前任务id（审批中心列表返回，与 processDefinitionName 同级；详情 info 需回传） */
  taskId?: number;
  /** 任务表单（含已存数据 value；无表单缺省） */
  taskForm?: TaskFormVO;
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime?: string;
  /** 更新时间（yyyy-MM-dd HH:mm:ss） */
  updateTime?: string;
}

// 查询类型：1 我发起的(进行中) / 5 我发起的(全部) / 0 草稿。
export type ProcessInstanceType = "1" | "5" | "0";

// 审批中心查询类型：2 待办 / 3 待认领 / 4 已办。
export type ApprovalInstanceType = "2" | "3" | "4";

// 分页查询参数（POST /processInstance/queryPage body）。
export interface ProcessInstancePageParam {
  /** 查询类型 */
  type: ProcessInstanceType | ApprovalInstanceType;
  /** 页大小 */
  size: number;
  /** 当前页码 */
  current: number;
  /** 搜索（可空） */
  search?: string;
}

// 发起 / 存草稿请求体（POST /processInstance/start | /processInstance/saveDraft）。响应只看 code。
export interface ProcessHandleParam {
  /** 流程定义id（发起/保存草稿时必填） */
  processDefinitionId: number;
  /** 自建流程实例id（编辑/提交既有草稿时携带；新建省略） */
  processInstanceId?: number;
  /** 流程标题（可空，后端兜底） */
  title?: string;
  /** 表单数据（键=fieldId；无表单省略） */
  globalFormData?: Record<string, unknown>;
}

// 实例状态徽标映射。键外（非 0/10/11）视为审批中。
export const PROCESS_INSTANCE_STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  "0": { label: "草稿", variant: "secondary" },
  "10": { label: "已完成", variant: "default" },
  "11": { label: "已终止", variant: "outline" },
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

// 审批中心列表 tab（顺序：待办 / 待认领 / 已办）。
export const APPROVAL_INSTANCE_TABS: {
  value: ApprovalInstanceType;
  label: string;
}[] = [
  { value: "2", label: "待办" },
  { value: "3", label: "待认领" },
  { value: "4", label: "已办" },
];

// 发起流程时的定义信息（/processDefinition/startInfo 响应）。后续会扩展表单信息等。
export interface ProcessStartInfo {
  /** 流程定义id */
  id?: number;
  /** 流程定义名称 */
  processName?: string;
  /** 当前版本 */
  version?: string;
  /** 发起表单（流程未绑定/节点继承时缺省） */
  startForm?: TaskFormVO;
}

// ===== 申请中心表单接入 =====

// 字段权限：VISIBLE 可见(默认) / READONLY 只读 / HIDDEN 隐藏 / REQUIRED 必填；空=VISIBLE。
// 优先级高于表单设计配置。
export type ProcessFieldPermission = "VISIBLE" | "READONLY" | "HIDDEN" | "REQUIRED";

// 流程表单字段：DynamicFormField + permission（+ value 回填，见 DynamicFormField.value）。
export type ProcessFormField = DynamicFormField & {
  permission?: ProcessFieldPermission | null;
};

// 流程表单分组：fields 换成 ProcessFormField。
export type ProcessFormGroup = Omit<DynamicFormFieldGroup, "fields"> & {
  fields: ProcessFormField[];
};

// 流程表单：DynamicForm 的 fields/groups 换成带 permission 的版本。
export type ProcessForm = Omit<DynamicForm, "fields" | "groups"> & {
  fields?: ProcessFormField[];
  groups?: ProcessFormGroup[];
};

// startInfo.startForm / processInstance.info.taskForm 包装。
export interface TaskFormVO {
  /** 全局表单（可能不存在：流程未绑定/节点继承） */
  globalForm?: ProcessForm;
}

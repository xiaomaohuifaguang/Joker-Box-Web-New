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
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime?: string;
  /** 更新时间（yyyy-MM-dd HH:mm:ss） */
  updateTime?: string;
}

// 查询类型：1 我发起的(进行中) / 5 我发起的(全部) / 0 草稿。
export type ProcessInstanceType = "1" | "5" | "0";

// 分页查询参数（POST /processInstance/queryPage body）。
export interface ProcessInstancePageParam {
  /** 查询类型 */
  type: ProcessInstanceType;
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

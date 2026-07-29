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
}

// 保存修改请求体（POST /processDefinition/save）。比 add 多 id。响应只看 code。
export interface ProcessDefinitionSavePayload extends ProcessDefinitionAddPayload {
  /** 流程id */
  id: number;
}

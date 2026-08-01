import { api } from "@/lib/api";
import type {
  DeployedProcessDefinition,
  Page,
  ProcessDefinition,
  ProcessDefinitionAddPayload,
  ProcessDefinitionPageParam,
  ProcessDefinitionSavePayload,
  ProcessHandleParam,
  ProcessInstance,
  ProcessInstancePageParam,
  SelectOption,
} from "@/types";

// 流程引擎接口（/processDefinition/*）。
// 编辑/查看/删除/停用/发布 等操作列已预留，接口路径待后端提供后补充。

// 分页：POST /processDefinition/queryPage，body { size, current, search? }。
export async function queryProcessDefinitionPage(
  params: ProcessDefinitionPageParam,
): Promise<Page<ProcessDefinition>> {
  const { data } = await api.post<Page<ProcessDefinition>>(
    "/processDefinition/queryPage",
    { body: params },
  );
  return data;
}

// 新建草稿：POST /processDefinition/add，body ProcessDefinition（含 rawData 画布数据）。响应只看 code。
export async function addProcessDefinition(
  payload: ProcessDefinitionAddPayload,
): Promise<void> {
  await api.post<unknown>("/processDefinition/add", { body: payload });
}

// 详情：POST /processDefinition/info，body { id }。响应 data = ProcessDefinition（含 rawData）。
export async function getProcessDefinitionInfo(id: number): Promise<ProcessDefinition> {
  const { data } = await api.post<ProcessDefinition>("/processDefinition/info", {
    body: { id },
  });
  return data;
}

// 保存修改：POST /processDefinition/save，body ProcessDefinition（比 add 多 id）。响应只看 code。
export async function saveProcessDefinition(
  payload: ProcessDefinitionSavePayload,
): Promise<void> {
  await api.post<unknown>("/processDefinition/save", { body: payload });
}

// 删除：POST /processDefinition/remove，body { id }。响应只看 code。
export async function removeProcessDefinition(id: number): Promise<void> {
  await api.post<unknown>("/processDefinition/remove", { body: { id } });
}

// 停用：POST /processDefinition/stop，body { id }。响应只看 code。
export async function stopProcessDefinition(id: number): Promise<void> {
  await api.post<unknown>("/processDefinition/stop", { body: { id } });
}

// 发布：POST /processDefinition/deploy，query 参数 id（注意：非 body）。响应只看 code。
export async function deployProcessDefinition(id: number): Promise<void> {
  await api.post<unknown>("/processDefinition/deploy", { params: { id } });
}

// 服务任务委托表达式下拉：POST /processDefinition/delegateExpressions，无参。响应 data = SelectOption[]。
export async function getDelegateExpressions(): Promise<SelectOption[]> {
  const { data } = await api.post<SelectOption[]>("/processDefinition/delegateExpressions");
  return data;
}

// ===== 申请中心（流程实例，第一版）=====

// 已部署流程列表：POST /processDefinition/deployList，无参。响应 data = DeployedProcessDefinition[]。
export async function getDeployList(): Promise<DeployedProcessDefinition[]> {
  const { data } = await api.post<DeployedProcessDefinition[]>(
    "/processDefinition/deployList",
  );
  return data;
}

// 实例分页：POST /processInstance/queryPage，body ProcessInstancePageParam。
export async function queryProcessInstancePage(
  params: ProcessInstancePageParam,
): Promise<Page<ProcessInstance>> {
  const { data } = await api.post<Page<ProcessInstance>>(
    "/processInstance/queryPage",
    { body: params },
  );
  return data;
}

// 发起流程：POST /processInstance/start，body ProcessHandleParam。响应只看 code。
export async function startProcessInstance(
  payload: ProcessHandleParam,
): Promise<void> {
  await api.post<unknown>("/processInstance/start", { body: payload });
}

// 保存草稿：POST /processInstance/saveDraft，body ProcessHandleParam。响应只看 code。
export async function saveProcessDraft(
  payload: ProcessHandleParam,
): Promise<void> {
  await api.post<unknown>("/processInstance/saveDraft", { body: payload });
}

// 实例详情：POST /processInstance/info，query 参数 id（注意：非 body）。响应 data = ProcessInstance。
export async function getProcessInstanceInfo(
  id: number,
): Promise<ProcessInstance> {
  const { data } = await api.post<ProcessInstance>("/processInstance/info", {
    params: { id },
  });
  return data;
}

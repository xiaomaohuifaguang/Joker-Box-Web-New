import { api } from "@/lib/api";
import type {
  DynamicForm,
  DynamicFormInstance,
  DynamicFormInstancePageParam,
  DynamicFormPageParam,
  DynamicFormPublishedVersion,
  DynamicFormSavePayload,
  Page,
} from "@/types";

// 动态表单接口（/dynamicForm/*）。全部 body 传参，响应判断 code。
// 第一版：列表/新增/编辑/删除/详情。发布、版本切换后续。

// 分页：POST /dynamicForm/queryPage。
export async function queryDynamicFormPage(
  params: DynamicFormPageParam,
): Promise<Page<DynamicForm>> {
  const { data } = await api.post<Page<DynamicForm>>(
    "/dynamicForm/queryPage",
    { body: params },
  );
  return data;
}

// 详情：POST /dynamicForm/info，body { id, version? }（编辑回显 / 发布态只读查看用；version 省略=默认 DRAFT 版本）。
export async function getDynamicFormInfo(
  id: string,
  version?: string,
): Promise<DynamicForm> {
  const { data } = await api.post<DynamicForm>("/dynamicForm/info", {
    body: version ? { id, version } : { id },
  });
  return data;
}

// 新增：POST /dynamicForm/add，body 同 SavePayload（无 id）。响应只看 code。
export async function addDynamicForm(
  payload: DynamicFormSavePayload,
): Promise<void> {
  await api.post<unknown>("/dynamicForm/add", { body: payload });
}

// 保存：POST /dynamicForm/update，body 同 SavePayload（含 id）。响应只看 code。
export async function updateDynamicForm(
  payload: DynamicFormSavePayload,
): Promise<void> {
  await api.post<unknown>("/dynamicForm/update", { body: payload });
}

// 删除：POST /dynamicForm/remove，body { id }。响应只看 code。
export async function removeDynamicForm(id: string): Promise<void> {
  await api.post<unknown>("/dynamicForm/remove", { body: { id } });
}

// 发布：POST /dynamicForm/deploy，query 参数 formId。响应只看 code。
export async function deployDynamicForm(formId: string): Promise<void> {
  await api.post<unknown>("/dynamicForm/deploy", { params: { formId } });
}

// 停用：POST /dynamicForm/stop，query 参数 formId。响应只看 code。
export async function stopDynamicForm(formId: string): Promise<void> {
  await api.post<unknown>("/dynamicForm/stop", { params: { formId } });
}

// 已发布版本列表：POST /dynamicForm/publishedForms，query 参数 formId。
// data 是 List（按 formId 聚合的版本记录，含 formId/formName/latestVersion/versions），编辑页版本切换用。
export async function getPublishedForms(
  formId: string,
): Promise<DynamicFormPublishedVersion[]> {
  const { data } = await api.post<DynamicFormPublishedVersion[]>(
    "/dynamicForm/publishedForms",
    { params: { formId } },
  );
  return data;
}

// 实例分页：POST /dynamicForm/instance/queryPage，body { search?, current, size }。
export async function queryDynamicFormInstancePage(
  params: DynamicFormInstancePageParam,
): Promise<Page<DynamicFormInstance>> {
  const { data } = await api.post<Page<DynamicFormInstance>>(
    "/dynamicForm/instance/queryPage",
    { body: params },
  );
  return data;
}

// 提交：POST /dynamicForm/submit，body 传参（同 /dynamicForm/* 其它接口，非 multipart）。
// body = { formId, version, data, formInstanceId? }（FormData 是后端接收 body 的对象）。
// data 是 Map<fieldId, value>，直接作 JSON 对象随 body 发送（后端反序列化）。
// formInstanceId 为「更新已提交实例」语义预留，本次新增提交不传。响应 data = 表单实例 id。
export async function submitDynamicForm(input: {
  formId: string;
  version: string;
  data: Record<string, unknown>;
  formInstanceId?: string;
}): Promise<string> {
  const { data } = await api.post<string>("/dynamicForm/submit", {
    body: {
      formId: input.formId,
      version: input.version,
      data: input.data,
      ...(input.formInstanceId ? { formInstanceId: input.formInstanceId } : {}),
    },
  });
  return data;
}

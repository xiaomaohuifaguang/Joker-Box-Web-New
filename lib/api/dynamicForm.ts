import { api, ApiError, handleUnauthorized } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type {
  DynamicForm,
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

// 提交：POST /dynamicForm/submit，multipart FormData（formId/version/data）。
// data 是 Map<fieldId, value>，序列化成 JSON 字符串塞单个 data 字段（后端反序列化）。
// formInstanceId 为「更新已提交实例」语义预留，本次新增提交不传。响应 data = 表单实例 id。
const SUBMIT_SUCCESS_CODE = 200;
export async function submitDynamicForm(input: {
  formId: string;
  version: string;
  data: Record<string, unknown>;
  formInstanceId?: string;
}): Promise<string> {
  const fd = new FormData();
  fd.append("formId", input.formId);
  fd.append("version", input.version);
  fd.append("data", JSON.stringify(input.data));
  if (input.formInstanceId) fd.append("formInstanceId", input.formInstanceId);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/joker-box/dynamicForm/submit", {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new ApiError(res.status, `提交失败: ${res.status}`);
  const body = await res.json().catch(() => null);
  if (!body) throw new ApiError(res.status, "提交失败：响应异常");
  handleUnauthorized(body.code, !!token);
  if (body.code !== SUBMIT_SUCCESS_CODE)
    throw new ApiError(body.code, body.msg || `提交失败: ${body.code}`);
  return body.data as string;
}

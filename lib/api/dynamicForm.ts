import { api } from "@/lib/api";
import type {
  DynamicForm,
  DynamicFormPageParam,
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

// 详情：POST /dynamicForm/info，body { id, version? }（编辑回显用；version 省略=最新）。
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

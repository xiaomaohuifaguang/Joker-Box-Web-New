import { api } from "@/lib/api";
import type {
  CodeItem,
  CodeItemQueryParam,
  CodeTable,
  CodeTablePageParam,
  Page,
} from "@/types";

// 码表管理接口：码表（/code-table/*）+ 码表项（/code-item/*）。
// id 走 query；列表/新增/更新走 body。tree/status 均为 "0"/"1" 字符串。

// ---- 码表 ----

// 码表分页：POST /code-table/page，body 传参。
export async function queryCodeTablePage(
  params: CodeTablePageParam,
): Promise<Page<CodeTable>> {
  const { data } = await api.post<Page<CodeTable>>("/code-table/page", {
    body: params,
  });
  return data;
}

// 新增码表：POST /code-table/add，body 传 CodeTable（无 id）。
export async function addCodeTable(codeTable: Omit<CodeTable, "id">): Promise<void> {
  await api.post<unknown>("/code-table/add", { body: codeTable });
}

// 更新码表：POST /code-table/update，body 传 CodeTable（含 id）。
export async function updateCodeTable(codeTable: CodeTable): Promise<void> {
  await api.post<unknown>("/code-table/update", { body: codeTable });
}

// 删除码表：POST /code-table/delete?id=，query 传参。
export async function deleteCodeTable(id: string): Promise<void> {
  await api.post<unknown>("/code-table/delete", { params: { id } });
}

// 码表详情：POST /code-table/detail?id=，query 传参。
export async function getCodeTableDetail(id: string): Promise<CodeTable> {
  const { data } = await api.post<CodeTable>("/code-table/detail", {
    params: { id },
  });
  return data;
}

// ---- 码表项 ----

// 码表项列表：POST /code-item/list，body 传 CodeItemQueryParam。返回扁平 List<CodeItem>（树形码表客户端按 parentId 组树）。
export async function listCodeItems(
  params: CodeItemQueryParam,
): Promise<CodeItem[]> {
  const { data } = await api.post<CodeItem[]>("/code-item/list", {
    body: params,
  });
  return data ?? [];
}

// 新增码表项：POST /code-item/add，body 传 CodeItem（无 id）。
export async function addCodeItem(codeItem: Omit<CodeItem, "id">): Promise<void> {
  await api.post<unknown>("/code-item/add", { body: codeItem });
}

// 更新码表项：POST /code-item/update，body 传 CodeItem（含 id）。拖拽排序/改挂用。
export async function updateCodeItem(codeItem: CodeItem): Promise<void> {
  await api.post<unknown>("/code-item/update", { body: codeItem });
}

// 删除码表项：POST /code-item/delete?id=，query 传参。
export async function deleteCodeItem(id: string): Promise<void> {
  await api.post<unknown>("/code-item/delete", { params: { id } });
}

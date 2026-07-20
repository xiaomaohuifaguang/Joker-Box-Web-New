import { api } from "@/lib/api";
import type { ApiPath, Cascade, Page, SelectOption } from "@/types";

// api 列表分页：POST /apiPath/queryPage，body 传参。
export async function queryApiPathPage(params: {
  search?: string;
  roleId?: string;
  server?: string;
  groupName?: string;
  size: number;
  current: number;
}): Promise<Page<ApiPath>> {
  const { data } = await api.post<Page<ApiPath>>("/apiPath/queryPage", {
    body: params,
  });
  return data;
}

// api 信息：POST /apiPath/info?server=&path=，query 传参。
export async function getApiPathInfo(
  server: string,
  path: string,
): Promise<ApiPath> {
  const { data } = await api.post<ApiPath>("/apiPath/info", {
    params: { server, path },
  });
  return data;
}

// api 更新（仅白名单）：POST /apiPath/update，body 传参。判断 code 即可。
export async function updateApiPath(params: {
  server: string;
  path: string;
  whiteList: string;
}): Promise<void> {
  await api.post<unknown>("/apiPath/update", { body: params });
}

// 角色选择器：POST /role/selector，无参。
export async function getRoleSelector(): Promise<SelectOption[]> {
  const { data } = await api.post<SelectOption[]>("/role/selector");
  return data;
}

// 服务->分组级联：POST /apiPath/cascadeServerGroup，无参。
// 第一层=服务，子层=分组。
export async function cascadeServerGroup(): Promise<Cascade[]> {
  const { data } = await api.post<Cascade[]>("/apiPath/cascadeServerGroup");
  return data;
}

import { api } from "@/lib/api";
import type { Org, OrgDetail, OrgTree, Page } from "@/types";

// 分页查询机构：POST /org/queryPage。
// parentId 为虚拟根 id（-1）时查顶级机构；搜索字段后端名是 searh（拼写如此），这里映射。
export async function queryOrgPage(params: {
  parentId: number;
  size: number;
  current: number;
  search?: string;
}): Promise<Page<Org>> {
  const { data } = await api.post<Page<Org>>("/org/queryPage", {
    parentId: String(params.parentId),
    size: params.size,
    current: params.current,
    searh: params.search ?? "",
  });
  return data;
}

// 机构树：POST /org/getOrgTree，无参。
// 后端返回单个虚拟根节点（id=-1, name="全部"），作为树的第一层单节点（[data]）；兼容直接返回数组。
export async function getOrgTree(): Promise<OrgTree[]> {
  const { data } = await api.post<OrgTree | OrgTree[]>("/org/getOrgTree");
  if (Array.isArray(data)) return data;
  return data ? [data] : [];
}

// 新增：POST /org/add。parentId=0 表示根级。
export async function addOrg(params: {
  parentId: number;
  name: string;
}): Promise<void> {
  await api.post<unknown>("/org/add", params);
}

// 删除：POST /org/remove，判断 code 即可（无 data）。
export async function removeOrg(id: number): Promise<void> {
  await api.post<unknown>("/org/remove", { id });
}

// 修改：POST /org/update。
export async function updateOrg(params: {
  id: number;
  parentId: number;
  name: string;
}): Promise<void> {
  await api.post<unknown>("/org/update", params);
}

// 详情：POST /org/info。
export async function getOrgInfo(id: number): Promise<OrgDetail> {
  const { data } = await api.post<OrgDetail>("/org/info", { id });
  return data;
}

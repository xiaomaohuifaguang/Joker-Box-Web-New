import { api } from "@/lib/api";
import type { Page, WebsitePageParam, WebsiteRecord } from "@/types";

// 网站收藏管理接口（/website/*）。分组无实体，groupName 是网站字段。
// id 走 query（delete）；列表/新增/保存走 body。

// 网站分页：POST /website/queryPage，body 传参。
export async function queryWebsitePage(
  params: WebsitePageParam,
): Promise<Page<WebsiteRecord>> {
  const { data } = await api.post<Page<WebsiteRecord>>("/website/queryPage", {
    body: params,
  });
  return data;
}

// 新增收藏：POST /website/add，body 传 Website（无 id/时间）。
export async function addWebsite(
  website: Omit<WebsiteRecord, "id" | "createTime" | "updateTime">,
): Promise<void> {
  await api.post<unknown>("/website/add", { body: website });
}

// 删除收藏：POST /website/delete?id=，query 传参。
export async function deleteWebsite(id: number): Promise<void> {
  await api.post<unknown>("/website/delete", { params: { id } });
}

// 修改：POST /website/save，body 传 Website（含 id，无时间）。
export async function saveWebsite(
  website: Omit<WebsiteRecord, "createTime" | "updateTime">,
): Promise<void> {
  await api.post<unknown>("/website/save", { body: website });
}

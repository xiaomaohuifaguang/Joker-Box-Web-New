import { api } from "@/lib/api";
import type { WebsiteGroup } from "@/types";

// 收藏网站分组列表：POST /website/group，无参。
export async function getWebsiteGroups(): Promise<WebsiteGroup[]> {
  const { data } = await api.post<WebsiteGroup[]>("/website/group");
  return data;
}

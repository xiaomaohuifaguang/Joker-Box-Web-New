import { api } from "@/lib/api";
import type { MailInfo, MailPageParam, Page } from "@/types";

// 邮件记录查询（/mailInfo/*）。只读：列表分页 + 详情。

// 邮件分页：POST /mailInfo/queryPage，body 传参。返回摘要（无 content/variable）。
export async function queryMailPage(
  params: MailPageParam,
): Promise<Page<MailInfo>> {
  const { data } = await api.post<Page<MailInfo>>("/mailInfo/queryPage", {
    body: params,
  });
  return data;
}

// 邮件详情：POST /mailInfo/info，body { id }。返回含 content(HTML) + variable(JSON)。
export async function getMailInfo(id: number): Promise<MailInfo> {
  const { data } = await api.post<MailInfo>("/mailInfo/info", {
    body: { id },
  });
  return data;
}

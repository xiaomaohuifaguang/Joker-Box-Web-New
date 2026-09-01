import { api } from "@/lib/api";
import type {
  Page,
  SystemPrompt,
  SystemPromptPageParam,
  SystemPromptPayload,
} from "@/types";

// 系统提示（全局公告）管理接口（/systemPrompt/*）。函数名加 sys 前缀，与 aiSystemPrompt.ts
// （/ai/systemPrompt/*，AI 提示词）的同名导出区分——两者是不同功能。均 POST + body，判断 code。

// 分页查询：POST /systemPrompt/queryPage，body PageParam（search 匹配 prompt，可空）。
export async function querySysPromptPage(
  params: SystemPromptPageParam,
): Promise<Page<SystemPrompt>> {
  const { data } = await api.post<Page<SystemPrompt>>(
    "/systemPrompt/queryPage",
    { body: params },
  );
  return data;
}

// 详情：POST /systemPrompt/info，body {id}（查看弹窗用；列表行已是全字段）。
export async function getSysPromptInfo(id: number): Promise<SystemPrompt> {
  const { data } = await api.post<SystemPrompt>("/systemPrompt/info", {
    body: { id },
  });
  return data;
}

// 新增：POST /systemPrompt/add，body {prompt, deadTime}，判断 code。
export async function addSysPrompt(
  payload: SystemPromptPayload,
): Promise<void> {
  await api.post<unknown>("/systemPrompt/add", { body: payload });
}

// 前台全局公告横幅：POST /system/prompt，无参（白名单接口，未登录可调）→ 生效中的公告列表。
export async function listActiveSysPrompts(): Promise<SystemPrompt[]> {
  const { data } = await api.post<SystemPrompt[]>("/system/prompt");
  return data;
}

// 删除：POST /systemPrompt/remove，body {id}，判断 code。无 update——公告只发不改。
export async function removeSysPrompt(id: number): Promise<void> {
  await api.post<unknown>("/systemPrompt/remove", { body: { id } });
}

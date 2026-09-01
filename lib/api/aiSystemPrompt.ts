import { api } from "@/lib/api";
import type {
  AiSystemPrompt,
  AiSystemPromptDetail,
  AiSystemPromptPageParam,
  AiSystemPromptPayload,
  AiSystemPromptUpdatePayload,
  Page,
} from "@/types";

// AI 系统提示词管理接口（/ai/systemPrompt/*）。info/delete 走 query 传参 id，其余 POST + body；
// 业务错误由 client 抛 ApiError。

// 分页查询：POST /ai/systemPrompt/queryPage，body PageParam（search 可空）。
export async function querySystemPromptPage(
  params: AiSystemPromptPageParam,
): Promise<Page<AiSystemPrompt>> {
  const { data } = await api.post<Page<AiSystemPrompt>>(
    "/ai/systemPrompt/queryPage",
    { body: params },
  );
  return data;
}

// 详情：POST /ai/systemPrompt/info，**query 传参** id（编辑回填用，含 prompt）。
export async function getSystemPromptInfo(
  id: number,
): Promise<AiSystemPromptDetail> {
  const { data } = await api.post<AiSystemPromptDetail>(
    "/ai/systemPrompt/info",
    { params: { id } },
  );
  return data;
}

// 新增：POST /ai/systemPrompt/add，判断 code。
export async function addSystemPrompt(
  payload: AiSystemPromptPayload,
): Promise<void> {
  await api.post<unknown>("/ai/systemPrompt/add", { body: payload });
}

// 修改：POST /ai/systemPrompt/update，含 id，判断 code。
export async function updateSystemPrompt(
  payload: AiSystemPromptUpdatePayload,
): Promise<void> {
  await api.post<unknown>("/ai/systemPrompt/update", { body: payload });
}

// 删除：POST /ai/systemPrompt/delete，**query 传参** id，判断 code。
export async function deleteSystemPrompt(id: number): Promise<void> {
  await api.post<unknown>("/ai/systemPrompt/delete", { params: { id } });
}

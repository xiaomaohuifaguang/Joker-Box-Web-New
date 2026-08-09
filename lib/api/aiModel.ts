import { api } from "@/lib/api";
import type {
  AiModel,
  AiModelDetail,
  AiModelPageParam,
  AiModelPayload,
  AiModelUpdatePayload,
  Page,
} from "@/types";

// AI 模型管理接口（/ai/model/*）。全部 POST + body 传参；业务错误由 client 抛 ApiError。

// 模型分页：POST /ai/model/queryPage。
export async function queryAiModelPage(
  params: AiModelPageParam,
): Promise<Page<AiModel>> {
  const { data } = await api.post<Page<AiModel>>("/ai/model/queryPage", {
    body: params,
  });
  return data;
}

// 模型详情：POST /ai/model/info，body 传 {id}（编辑回填用，含 apiKey/baseUrl/paths）。
export async function getAiModelInfo(id: string): Promise<AiModelDetail> {
  const { data } = await api.post<AiModelDetail>("/ai/model/info", {
    body: { id },
  });
  return data;
}

// 新增：POST /ai/model/add，判断 code。
export async function addAiModel(payload: AiModelPayload): Promise<void> {
  await api.post<unknown>("/ai/model/add", { body: payload });
}

// 修改：POST /ai/model/update，含 id，判断 code。
export async function updateAiModel(
  payload: AiModelUpdatePayload,
): Promise<void> {
  await api.post<unknown>("/ai/model/update", { body: payload });
}

// 删除：POST /ai/model/remove，body 传 {id}，判断 code。
export async function removeAiModel(id: string): Promise<void> {
  await api.post<unknown>("/ai/model/remove", { body: { id } });
}

// AI 模型管理相关类型（对应 /ai/model/* 接口）。
// 列表项 AiModel 无 apiKey/baseUrl/paths；编辑需走 /ai/model/info 拉 AiModelDetail 回填。

/** 模型列表项（/ai/model/queryPage records 元素）。 */
export interface AiModel {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
  /** 描述 */
  description: string;
}

/** 模型详情（/ai/model/info 返回，含敏感/连接字段，用于编辑回填）。 */
export interface AiModelDetail {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
  /** API密钥（可空） */
  apiKey: string;
  /** 基础URL */
  baseUrl: string;
  /** completions请求路径（可空） */
  completionsPath: string;
  /** embeddings请求路径（可空） */
  embeddingsPath: string;
  /** 描述（可空） */
  description: string;
}

/** /ai/model/queryPage body。 */
export interface AiModelPageParam {
  search?: string;
  current: number;
  size: number;
}

/** 新增/修改共用字段（completionsPath/embeddingsPath/apiKey/description 可空）。 */
export interface AiModelPayload {
  name: string;
  model: string;
  baseUrl: string;
  completionsPath: string;
  embeddingsPath: string;
  apiKey: string;
  description: string;
}

/** 修改（/ai/model/update）= 共用字段 + id。 */
export type AiModelUpdatePayload = AiModelPayload & { id: string };

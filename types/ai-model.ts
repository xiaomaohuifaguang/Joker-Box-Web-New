// AI 模型管理相关类型（对应 /ai/model/* 接口）。
// 列表项 AiModel 无 apiKey/baseUrl/paths；编辑需走 /ai/model/info 拉 AiModelDetail 回填。

/** 模型类型枚举（后端字典值）。 */
export type AiModelType = "CHAT" | "EMBEDDING";

/** 模型类型 -> 中文名（tab 筛选、表格列、表单 Select 共用）。 */
export const AI_MODEL_TYPE_LABELS: Record<AiModelType, string> = {
  CHAT: "对话模型",
  EMBEDDING: "向量模型",
};

/** 默认模型条目（/ai/model/defaultModelSettings value，精简信息）。 */
export interface AiModelDefaultEntry {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
}

/**
 * 默认模型配置集合（/ai/model/defaultModelSettings data：Map<String, AiModel>）。
 * key=类型，value=该类型默认模型；某类型未设默认则缺该 key（value 可能为空）。
 * 唯一权威：每行是否默认由 defaults[row.type]?.id === row.id 现算，不在行里存冗余标志。
 */
export type AiModelDefaultMap = Partial<Record<AiModelType, AiModelDefaultEntry>>;

/** 模型列表项（/ai/model/queryPage records 元素）。 */
export interface AiModel {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /** 模型 */
  model: string;
  /** 类型（CHAT 对话 / EMBEDDING 向量） */
  type: AiModelType;
  /** 向量维度（仅 EMBEDDING 有值） */
  dimension?: number;
  /** 图形理解能力（默认 false） */
  vision?: boolean;
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
  /** 类型（CHAT 对话 / EMBEDDING 向量） */
  type: AiModelType;
  /** API密钥（可空） */
  apiKey: string;
  /** 基础URL */
  baseUrl: string;
  /** completions请求路径（可空） */
  completionsPath: string;
  /** embeddings请求路径（可空） */
  embeddingsPath: string;
  /** 向量维度（仅 EMBEDDING 有值） */
  dimension?: number;
  /** 图形理解能力（默认 false） */
  vision?: boolean;
  /** 描述（可空） */
  description: string;
}

/** /ai/model/queryPage body。type 缺省=全部。 */
export interface AiModelPageParam {
  search?: string;
  type?: AiModelType;
  current: number;
  size: number;
}

/** 新增/修改共用字段（completionsPath/embeddingsPath/apiKey/description 可空；dimension 仅 EMBEDDING 必填）。 */
export interface AiModelPayload {
  name: string;
  model: string;
  type: AiModelType;
  /** 向量维度：仅 type=EMBEDDING 时传（必填），CHAT 不传。 */
  dimension?: number;
  /** 图形理解能力：默认 false，始终随表单提交。 */
  vision: boolean;
  baseUrl: string;
  completionsPath: string;
  embeddingsPath: string;
  apiKey: string;
  description: string;
}

/** 修改（/ai/model/update）= 共用字段 + id。apiKey 可省——仅当被修改时才传，未改则不带该字段。 */
export type AiModelUpdatePayload = Omit<AiModelPayload, "apiKey"> & {
  id: string;
  apiKey?: string;
};

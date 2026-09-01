// AI 系统提示词管理相关类型（对应 /ai/systemPrompt/* 接口）。
// 列表项 AiSystemPrompt 无 prompt；编辑需走 /ai/systemPrompt/info 拉 AiSystemPromptDetail 回填。

/** 系统提示词列表项（/ai/systemPrompt/queryPage records 元素，不含 prompt）。 */
export interface AiSystemPrompt {
  /** id */
  id: number;
  /** 描述 */
  description: string;
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime: string;
  /** 更新时间（yyyy-MM-dd HH:mm:ss） */
  updateTime: string;
}

/** 系统提示词详情（/ai/systemPrompt/info 返回，含 prompt，用于编辑回填）。 */
export interface AiSystemPromptDetail extends AiSystemPrompt {
  /** 提示词内容 */
  prompt: string;
}

/** /ai/systemPrompt/queryPage body。 */
export interface AiSystemPromptPageParam {
  search?: string;
  current: number;
  size: number;
}

/** 新增（/ai/systemPrompt/add）。description/prompt 均必填。 */
export interface AiSystemPromptPayload {
  description: string;
  prompt: string;
}

/** 修改（/ai/systemPrompt/update）= 共用字段 + id。 */
export type AiSystemPromptUpdatePayload = AiSystemPromptPayload & {
  id: number;
};

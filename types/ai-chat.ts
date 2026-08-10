// AI 会话相关类型（对应 /ai/completions/* 接口）。

/** 消息角色（后端大写，前端归一化小写比对）。 */
export type ChatRole = "system" | "user" | "assistant" | "tool";

/** CHAT 类型模型（/ai/completions/models 返回）。 */
export interface ChatModel {
  id: string;
  name: string;
  model: string;
  description: string;
}

/** 会话（/ai/completions/sessions 返回）。 */
export interface ChatSession {
  sessionId: string;
  title: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  updateTime: string;
}

/** 消息（/ai/completions/messages 与 /chat 返回/增量帧）。 */
export interface ChatMessage {
  messageId: string;
  sessionId: string;
  /** 后端大写（USER/ASSISTANT/...）；增量帧可能为 null。 */
  role: string | null;
  content: string;
  /** 思考内容（增量帧为追加片段）。 */
  reasonContent: string | null;
  /** yyyy-MM-dd HH:mm:ss；增量帧为 null。 */
  createTime: string | null;
}

/** /ai/completions/chat body。 */
export interface ChatRequestParam {
  /** 模型 id（必填） */
  modelId: string;
  /** 会话 id（选填；缺省后端自动建会话） */
  sessionId?: string;
  /** 用户输入内容 */
  content: string;
  /** 是否流式 */
  stream: boolean;
}

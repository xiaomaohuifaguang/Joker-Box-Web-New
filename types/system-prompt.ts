// 系统提示（全局公告）管理相关类型（对应 /systemPrompt/* 接口）。
// 与 ai-system-prompt（/ai/systemPrompt/*）无关，是另一功能：管理者发布的全局公告。
// 无 update 接口——公告发了不能改，只能删除重发。

/** 系统提示（/systemPrompt/queryPage records 元素 = /systemPrompt/info 返回，字段一致）。 */
export interface SystemPrompt {
  /** 系统提示id */
  id: number;
  /** 系统提示消息 */
  prompt: string;
  /** 创建人id */
  createBy: string;
  /** 创建人名称 */
  createByName: string;
  /** 创建时间（yyyy-MM-dd HH:mm:ss） */
  createTime: string;
  /** 截止时间（yyyy-MM-dd HH:mm:ss） */
  deadTime: string;
}

/** /systemPrompt/queryPage body（search 匹配 prompt 内容）。 */
export interface SystemPromptPageParam {
  search?: string;
  current: number;
  size: number;
}

/** 新增（/systemPrompt/add）。prompt/deadTime 均必填；deadTime 格式 yyyy-MM-dd HH:mm:ss。 */
export interface SystemPromptPayload {
  prompt: string;
  deadTime: string;
}

// 邮件记录相关类型（对应 /mailInfo/* 接口）。
// 只读日志：列表返回摘要（无 content/variable），详情（/mailInfo/info）返回全文。

/** 邮件记录。列表只有摘要字段；content/variable 由 /mailInfo/info 返回。 */
export interface MailInfo {
  /** 邮件 id */
  id: number;
  /** 收件人邮箱 */
  toMail: string;
  /** 主题 */
  subject: string;
  /** yyyy-MM-dd HH:mm:ss */
  sendTime: string;
  /** 邮件内容（HTML，详情才有） */
  content?: string;
  /** 变量（JSON 字符串，详情才有） */
  variable?: string;
}

/** /mailInfo/queryPage body。 */
export interface MailPageParam {
  search?: string;
  current: number;
  size: number;
}

// 干大事论坛相关类型（对应 /ganDaShiPost/* 与 /ganDaShiComment/* 接口）。
// 帖子 content 是富文本(HTML)，text 是纯文字；评论 comment 是富文本(HTML)。
// 注意：post.id 是 number，但 comment 的 postId/parentId/replayId 是 string（后端 String）。

/** 帖子。列表无 content/text；详情（/ganDaShiPost/info）才有。 */
export interface GanDaShiPost {
  id: number;
  title: string;
  /** 摘要（列表有，后端从 content/text 生成） */
  digest: string;
  createUsername: string;
  /** 创建人用户 id */
  createBy: string;
  /** 创建人昵称 */
  createByName: string;
  createTime: string;
  /** 浏览量 */
  viewCount: number;
  /** 内容（富文本 HTML，详情才有） */
  content?: string;
  /** 纯文字（详情才有） */
  text?: string;
}

/** /ganDaShiPost/queryPage body。 */
export interface GanDaShiPostPageParam {
  createUsername?: string;
  userId?: string;
  search?: string;
  current: number;
  size: number;
}

/** 评论。parentId 为空=根评论；非空=该根下的子评论。replayId 为空=回复根，非空=回复某子评论。 */
export interface GanDaShiComment {
  id: number;
  postId: string;
  /** 主评论 id（根为空串） */
  parentId: string;
  /** 回复的评论 id（为空=回复主评论，非空=回复某子评论） */
  replayId: string;
  /** 回复的评论人名称 */
  replayName: string;
  /** 评论内容（富文本 HTML） */
  comment: string;
  createByName: string;
  createTime: string;
  /** 回复数量 */
  replayCount: number;
}

/** /ganDaShiComment/queryPage body。parentId 为空查根评论，非空查该评论的子评论。 */
export interface GanDaShiCommentPageParam {
  postId: string;
  parentId?: string;
  current: number;
  size: number;
}

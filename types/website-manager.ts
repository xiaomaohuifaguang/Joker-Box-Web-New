// 网站收藏管理相关类型（对应 /website/* 管理接口）。
// 区别于 types/website.ts 的前台 Website（无 id/时间），这里是后台管理的完整记录。
// 分组无独立实体 —— groupName 是网站上的字符串，分组由 /website/group 派生。

/** 网站记录（/website/queryPage records 元素）。 */
export interface WebsiteRecord {
  /** id */
  id: number;
  /** 分组名称（默认 "默认"） */
  groupName: string;
  /** 地址 */
  url: string;
  /** 标题 */
  title: string;
  /** 简介 */
  description: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}

/** /website/queryPage body。 */
export interface WebsitePageParam {
  search?: string;
  groupName?: string;
  current: number;
  size: number;
}

// 收藏网站相关类型（对应 /website/group 接口）。

export interface Website {
  /** 分组名称（与所属分组一致） */
  groupName: string;
  /** 地址 */
  url: string;
  /** 标题 */
  title: string;
  /** 简介 */
  description: string;
}

export interface WebsiteGroup {
  /** 组名称 */
  groupName: string;
  /** 组内网站 */
  child: Website[];
}

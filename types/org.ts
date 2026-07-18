// 机构相关类型（对应 /org/* 接口）。

// 机构列表项（/org/queryPage 返回的 records 元素）。
export interface Org {
  id: number;
  parentId: number;
  parentName: string;
  name: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}

// 机构详情（/org/info）。
export interface OrgDetail {
  id: number;
  parentId: number;
  name: string;
  createTime: string;
  updateTime: string;
}

// 机构树节点（/org/getOrgTree）。
export interface OrgTree {
  id: number;
  name: string;
  parentId: number;
  parentName: string;
  children?: OrgTree[];
}

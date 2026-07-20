// API 管理相关类型（对应 /apiPath/* 接口）。

export interface ApiPath {
  /** api 路径 */
  path: string;
  /** 服务名称 */
  server: string;
  /** 是否白名单："1" 是 / "0" 否 */
  whiteList: string;
  /** 名称 */
  name: string;
  /** 分组名称 */
  groupName: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}

/** 级联选项（服务 -> 分组）。 */
export interface Cascade {
  /** 用到的值（服务名或分组名） */
  value: string;
  /** 显示的值 */
  label: string;
  /** 子级（仅服务层有，子层是分组）*/
  children?: Cascade[];
}

/** 角色选择器选项。 */
export interface SelectOption {
  /** key（roleId） */
  key: string;
  /** value（显示名） */
  value: string;
}

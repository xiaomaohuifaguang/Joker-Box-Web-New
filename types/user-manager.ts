// 用户管理相关类型（对应 /user/* 接口）。
// 注意：区别于 types/user.ts 的「当前登录用户」类型（/auth/userInfo），这里是后台用户管理的记录类型。

/** 用户扩展信息（/user/* 返回的 userExtend）。 */
export interface UserExtend {
  /** 性别 */
  sex: string;
  /** 邮箱 */
  mail: string;
  /** 手机号（Java Long，JS number） */
  phone: number;
}

/** 用户记录（/user/queryPage 的 records 元素 / /user/userInfo 的 data）。 */
export interface UserRecord {
  /** 用户 id */
  id: number;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 创建时间 yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** 更新时间 yyyy-MM-dd HH:mm:ss */
  updateTime: string;
  /** 扩展信息 */
  userExtend: UserExtend;
}

/** 用户已绑定角色（/user/roles 返回元素）。 */
export interface UserRole {
  /** 角色 id */
  id: number;
  /** 角色名称 */
  name: string;
}

/** 用户已绑定机构（/user/orgs 返回元素，比 Org 轻量：无 parentName/createTime/updateTime）。 */
export interface UserOrgItem {
  /** 机构 id */
  id: number;
  /** 父级机构 id */
  parentId: number;
  /** 机构名称 */
  name: string;
}

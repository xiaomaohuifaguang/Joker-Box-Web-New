// 当前登录用户信息（对应后端 POST /auth/userInfo 返回的 data）。
// authPaths 为权限路径（路由地址），暂未使用，后续菜单多了再处理。

export interface Role {
  /** 角色名称 */
  name: string;
}

export interface Org {
  /** 机构名称 */
  name: string;
}

export interface User {
  /** 用户 id */
  userId: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 角色 */
  roles: Role[];
  /** 机构 */
  orgs: Org[];
  /** 是否管理员 */
  admin: boolean;
  /** 性别（后端默认 "未知"） */
  sex: string;
  /** 邮箱 */
  mail: string;
  /** 手机号（Java Long，JS number） */
  phone: number;
  /** 权限路径（路由地址），控制导航菜单显示 */
  authPaths: string[];
}

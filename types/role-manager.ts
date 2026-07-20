import type { MenuApiPathSaveServer } from "./menu-manager";

// 角色管理相关类型（对应 /role/* 接口）。
// 角色是权限包：用户绑定归 user-manager；这里管角色的 apiPath 权限 + 菜单权限（分前后台）。

/** 角色（/role/queryPage records 元素 / /role/info data）。
 *  区别于 types/user.ts 的 Role（当前登录用户的精简角色 {name}），这里是后台管理的完整角色记录。 */
export interface RoleRecord {
  /** 角色 id */
  id: number;
  /** 角色名称 */
  name: string;
  /** 是否后台管理权限："1" 是 / "0" 否 */
  admin: string;
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}

/** /role/queryPage body。 */
export interface RolePageParam {
  search?: string;
  current: number;
  size: number;
}

/** /role/save body。menuChoose = 前后台选中菜单 id 合并成一个 list。 */
export interface RoleSavePayload {
  role: { id: number; name: string; admin: string };
  apiPathTree: MenuApiPathSaveServer[];
  menuChoose: number[];
}

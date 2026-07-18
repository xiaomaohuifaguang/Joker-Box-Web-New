// 后端菜单（POST /menu/menuTree 返回 data 的元素）。
// 前台/后台导航均由此接口驱动；whiteList 决定是否需要 authPaths 鉴权。

/** 菜单类型：-1 后台 / -2 前台 */
export const MENU_TYPE = {
  /** 后台 */
  CONSOLE: -1,
  /** 前台 */
  FRONT: -2,
} as const;
export type MenuType = (typeof MENU_TYPE)[keyof typeof MENU_TYPE];

export interface Menu {
  /** 路由地址 */
  path: string;
  /** 显示名称 */
  name: string;
  /** 子菜单 */
  children?: Menu[];
  /** 是否白名单："1" 是（无需 authPaths 鉴权，未登录可见）/ "0" 否 */
  whiteList: string;
}

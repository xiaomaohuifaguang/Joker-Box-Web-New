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

/** menuType 选项（配置驱动；未来加类型在此追加即可，UI 自动跟随）。 */
export const MENU_TYPES: { value: MenuType; label: string }[] = [
  { value: MENU_TYPE.FRONT, label: "前台菜单" },
  { value: MENU_TYPE.CONSOLE, label: "后台菜单" },
];

/** 取 menuType 的显示标签（未知类型兜底"菜单"）。 */
export function menuTypeLabel(value: number): string {
  return MENU_TYPES.find((t) => t.value === value)?.label ?? "菜单";
}

export interface Menu {
  /** 路由地址 */
  path: string;
  /** 显示名称 */
  name: string;
  /** 图标名（lucide 图标名，如 "Building2"）；接口未返回/未设置时为 undefined，渲染兜底 LayoutGrid */
  icon?: string;
  /** 子菜单 */
  children?: Menu[];
  /** 是否白名单："1" 是（无需 authPaths 鉴权，未登录可见）/ "0" 否 */
  whiteList: string;
}

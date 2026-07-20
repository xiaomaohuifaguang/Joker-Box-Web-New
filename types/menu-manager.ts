// 菜单管理相关类型（对应 /menu/* 管理接口）。
// 注意：区别于 types/menu.ts 的「导航渲染」Menu（/menu/menuTree，仅 path/name/children/whiteList），
// 这里是后台管理的全量菜单节点，字段更全（id/parentId/icon/sort/时间）。

/** 管理用菜单节点（/menu/menuTreeAll 与 /menu/info 的 data 元素）。 */
export interface MenuNode {
  /** 菜单 id */
  id: number;
  /** 父级 id；根路径为 -1 */
  parentId: number;
  /** 路由地址 */
  path: string;
  /** 显示名称 */
  name: string;
  /** 图标名（lucide 图标名，如 "Building2"）；空串表示未设置 */
  icon: string;
  /** 排序值，升序 */
  sort: number;
  /** 是否白名单："1" 是 / "0" 否 */
  whiteList: string;
  /** 子菜单 */
  children?: MenuNode[];
  /** yyyy-MM-dd HH:mm:ss */
  createTime: string;
  /** yyyy-MM-dd HH:mm:ss */
  updateTime: string;
}

/** 菜单新增/修改/保存时的菜单体（不含 children/时间）。id 在新增时省略。 */
export interface MenuPayload {
  /** 菜单 id（新增时省略） */
  id?: number;
  /** 父级 id；根路径为 -1 */
  parentId: number;
  /** 路由地址 */
  path: string;
  /** 显示名称 */
  name: string;
  /** 图标名 */
  icon: string;
  /** 排序值 */
  sort: number;
  /** 菜单类型：-1 后台 / -2 前台 */
  menuType: number;
  /** 是否白名单："1" 是 / "0" 否 */
  whiteList: string;
}

// ---- 菜单 ↔ api 路径绑定（/menu/apiPathTreeWithMenu 与 /menu/save 的 apiPathTree）----

/** 绑定树中的 api 路径（加载，/menu/apiPathTreeWithMenu 返回）。 */
export interface MenuApiPath {
  /** api 路径 */
  path: string;
  /** 服务名称 */
  server: string;
  /** 是否白名单："1" 是 / "0" 否（白名单 api 无需绑定，前端禁用勾选） */
  whiteList: string;
  /** 名称 */
  name: string;
  /** 分组名称 */
  groupName: string;
  /** 是否已与当前菜单绑定 */
  roleBind: boolean;
}

/** 绑定树中的分组（加载）。 */
export interface MenuApiPathGroup {
  /** 分组名称 */
  groupName: string;
  /** 组下 api 路径 */
  apiPaths: MenuApiPath[];
}

/** 绑定树中的服务（加载）。 */
export interface MenuApiPathServer {
  /** 服务名称 */
  server: string;
  /** 服务下分组 */
  groups: MenuApiPathGroup[];
}

/** 保存时回传的 api 路径项（仅 path + server）。 */
export interface MenuApiPathSaveItem {
  path: string;
  server: string;
}

/** 保存时回传的分组。 */
export interface MenuApiPathSaveGroup {
  groupName: string;
  apiPaths: MenuApiPathSaveItem[];
}

/** 保存时回传的服务。 */
export interface MenuApiPathSaveServer {
  server: string;
  groups: MenuApiPathSaveGroup[];
}

/** /menu/save 的 body。 */
export interface MenuAndApiPath {
  menu: MenuPayload & { id: number };
  apiPathTree: MenuApiPathSaveServer[];
}

// api 路径在选中集合中的 key：server + path 唯一标识一个 api。
export function apiPathKey(server: string, path: string): string {
  return `${server}||${path}`;
}

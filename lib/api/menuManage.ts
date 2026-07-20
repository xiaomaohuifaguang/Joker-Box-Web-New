import { api } from "@/lib/api";
import type {
  MenuAndApiPath,
  MenuApiPathServer,
  MenuNode,
  MenuPayload,
} from "@/types";

// 菜单管理接口（/menu/*）。区别于 lib/api/menu.ts 的导航渲染接口（/menu/menuTree）。
// menuType 统一 number（-1 后台 / -2 前台）；管理用全量树不过滤 token。

// 全量菜单树：POST /menu/menuTreeAll?menuType=，query 传参。
// 返回 List<Menu>（含 children 嵌套）；按 sort 升序由调用方排。
export async function getMenuTreeAll(menuType: number): Promise<MenuNode[]> {
  const { data } = await api.post<MenuNode[]>("/menu/menuTreeAll", {
    params: { menuType },
  });
  return data ?? [];
}

// 菜单已关联 api 路径关系树：POST /menu/apiPathTreeWithMenu?menuId=，query 传参。
// 返回全量 api 树（server -> group -> apiPath），apiPath.roleBind 标识是否已绑定。
export async function getMenuApiPathTree(
  menuId: string,
): Promise<MenuApiPathServer[]> {
  const { data } = await api.post<MenuApiPathServer[]>(
    "/menu/apiPathTreeWithMenu",
    { params: { menuId } },
  );
  return data ?? [];
}

// 新增菜单：POST /menu/add，body 传 Menu（无 id）。判断 code 即可。
export async function addMenu(menu: MenuPayload): Promise<void> {
  await api.post<unknown>("/menu/add", { body: menu });
}

// 删除菜单：POST /menu/remove，body { id }。判断 code 即可。
export async function removeMenu(id: number): Promise<void> {
  await api.post<unknown>("/menu/remove", { body: { id } });
}

// 修改菜单（仅字段，不动绑定）：POST /menu/update，body 传 Menu（含 id）。
// 拖拽排序/改挂用此接口逐个更新被移动菜单。
export async function updateMenu(
  menu: MenuPayload & { id: number },
): Promise<void> {
  await api.post<unknown>("/menu/update", { body: menu });
}

// 菜单 + 绑定 保存：POST /menu/save，body { menu, apiPathTree }。判断 code 即可。
// 编辑菜单时用此接口一次性保存字段与 api 绑定。
export async function saveMenuWithApi(
  payload: MenuAndApiPath,
): Promise<void> {
  await api.post<unknown>("/menu/save", { body: payload });
}

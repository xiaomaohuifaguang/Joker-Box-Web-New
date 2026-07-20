import { api } from "@/lib/api";
import type {
  MenuApiPathServer,
  Page,
  RoleRecord,
  RolePageParam,
  RoleSavePayload,
} from "@/types";

// 角色管理接口（/role/*）。角色 = 权限包：apiPath 权限 + 菜单权限（分前后台）。
// 用户绑定归 user-manager（/user/addRole 等），此处不涉及。
// roleId/menuType 统一 number；id 参数走 query。

// 角色列表分页：POST /role/queryPage，body 传参。
export async function queryRolePage(
  params: RolePageParam,
): Promise<Page<RoleRecord>> {
  const { data } = await api.post<Page<RoleRecord>>("/role/queryPage", {
    body: params,
  });
  return data;
}

// 新增角色：POST /role/add?roleName=&withRole=，query 传参。withRole 可选（复制源角色 id，继承其权限）。
export async function addRole(roleName: string, withRole?: number): Promise<void> {
  await api.post<unknown>("/role/add", {
    params: { roleName, withRole },
  });
}

// 删除角色（软）：POST /role/delete?roleId=。有绑定（用户/菜单/api）则失败。
export async function deleteRole(roleId: number): Promise<void> {
  await api.post<unknown>("/role/delete", { params: { roleId } });
}

// 强制删除（级联删绑定）：POST /role/destroy?roleId=。
export async function destroyRole(roleId: number): Promise<void> {
  await api.post<unknown>("/role/destroy", { params: { roleId } });
}

// 角色详情：POST /role/info?roleId=。返回 RoleRecord（name + admin + 时间）。
export async function getRoleInfo(roleId: number): Promise<RoleRecord> {
  const { data } = await api.post<RoleRecord>("/role/info", {
    params: { roleId },
  });
  return data;
}

// 角色关联 api 路径关系树：POST /role/apiPathTreeWithRole?roleId=。
// 同 menu-manager 的 apiPathTreeWithMenu 结构（ApiPathServer，apiPath.roleBind 标识已绑定）。
export async function getRoleApiPathTree(
  roleId: number,
): Promise<MenuApiPathServer[]> {
  const { data } = await api.post<MenuApiPathServer[]>(
    "/role/apiPathTreeWithRole",
    { params: { roleId } },
  );
  return data ?? [];
}

// 角色已选菜单 id 集合：POST /role/menuChoose?roleId=&menuType=。按 menuType 分查（-1 后台 / -2 前台）。
export async function getRoleMenuChoose(
  roleId: number,
  menuType: number,
): Promise<number[]> {
  const { data } = await api.post<number[]>("/role/menuChoose", {
    params: { roleId, menuType },
  });
  return data ?? [];
}

// 角色保存：POST /role/save，body { role, apiPathTree, menuChoose }。
// menuChoose 为前后台选中菜单 id 合并；判断 code 即可。
export async function saveRole(payload: RoleSavePayload): Promise<void> {
  await api.post<unknown>("/role/save", { body: payload });
}

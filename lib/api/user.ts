import { api } from "@/lib/api";
import type { Page, UserOrgItem, UserRecord, UserRole } from "@/types";

// 用户管理接口（/user/*）。区别于 lib/api/auth.ts 的当前登录用户接口（/auth/*）。
// id 参数统一 string（契合后端 String userId/roleId/orgId）；调用处用 String(record.id) 转换。

// 用户列表分页：POST /user/queryPage，body 传参。orgId 为空（虚拟根 -1）时省略 = 全部用户。
export async function queryUserPage(params: {
  search?: string;
  roleId?: string;
  orgId?: string;
  current: number;
  size: number;
}): Promise<Page<UserRecord>> {
  const { data } = await api.post<Page<UserRecord>>("/user/queryPage", {
    body: params,
  });
  return data;
}

// 用户详情：POST /user/userInfo?userId=，query 传参。
// 不命名 getUserInfo，以免与 lib/api/auth.ts 的当前登录用户接口（/auth/userInfo）撞名。
export async function getUserDetail(userId: string): Promise<UserRecord> {
  const { data } = await api.post<UserRecord>("/user/userInfo", {
    params: { userId },
  });
  return data;
}

// 删除用户：POST /user/delete?userId=，判断 code 即可。
export async function deleteUser(userId: string): Promise<void> {
  await api.post<unknown>("/user/delete", { params: { userId } });
}

// 重置密码：POST /user/resetPassword?userId=，判断 code 即可。
export async function resetPassword(userId: string): Promise<void> {
  await api.post<unknown>("/user/resetPassword", { params: { userId } });
}

// 用户已绑定角色：POST /user/roles?userId=。
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data } = await api.post<UserRole[]>("/user/roles", {
    params: { userId },
  });
  return data;
}

// 添加角色绑定：POST /user/addRole?userId=&roleId=，判断 code 即可。
export async function addUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  await api.post<unknown>("/user/addRole", { params: { userId, roleId } });
}

// 删除角色绑定：POST /user/deleteRole?userId=&roleId=，判断 code 即可。
export async function removeUserRole(
  userId: string,
  roleId: string,
): Promise<void> {
  await api.post<unknown>("/user/deleteRole", { params: { userId, roleId } });
}

// 用户已绑定机构：POST /user/orgs?userId=。
export async function getUserOrgs(userId: string): Promise<UserOrgItem[]> {
  const { data } = await api.post<UserOrgItem[]>("/user/orgs", {
    params: { userId },
  });
  return data;
}

// 添加机构绑定：POST /user/addOrg?userId=&orgId=，判断 code 即可。
export async function addUserOrg(
  userId: string,
  orgId: string,
): Promise<void> {
  await api.post<unknown>("/user/addOrg", { params: { userId, orgId } });
}

// 删除机构绑定：POST /user/deleteOrg?userId=&orgId=，判断 code 即可。
export async function removeUserOrg(
  userId: string,
  orgId: string,
): Promise<void> {
  await api.post<unknown>("/user/deleteOrg", { params: { userId, orgId } });
}

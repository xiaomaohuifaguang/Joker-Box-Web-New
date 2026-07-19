import { api } from "@/lib/api";
import type { Menu, MenuType } from "@/types";

// 具有权限菜单树：POST /menu/menuTree?menuType=<-1|-2>（-1 后台 / -2 前台）。
// 未登录可请求；已登录由 lib/api/client.ts 自动带 token。
// 返回 data 为 Menu[] 树；后端已按 token 过滤，客户端直接渲染。
export async function getMenuTree(menuType: MenuType): Promise<Menu[]> {
  const { data } = await api.post<Menu[]>("/menu/menuTree", {
    params: { menuType },
  });
  return data;
}

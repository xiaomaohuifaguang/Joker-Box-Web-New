import type { Menu } from "@/types";

// 导航匹配（前台顶栏/侧栏、后台侧栏、移动菜单、全局搜索共用）。

export interface MenuLeaf {
  menu: Menu;
  /** 祖先菜单名（从顶级到直接父级） */
  parents: string[];
}

/** 把菜单树拍平成叶子节点（父级通常没有真实页面，不作为导航目标）。 */
export function flattenMenuLeaves(items: Menu[], parents: string[] = []): MenuLeaf[] {
  return items.flatMap((item) =>
    item.children?.length
      ? flattenMenuLeaves(item.children, [...parents, item.name])
      : [{ menu: item, parents }],
  );
}

/**
 * 当前路由命中的叶子路径：取最长匹配。
 * 菜单路径可能互为前缀（/process/application 与 /process/application/oa），
 * 裸 startsWith 会同时点亮两项，所以只认最具体的一项。
 */
export function findActiveLeaf(items: Menu[], pathname: string): string | undefined {
  return flattenMenuLeaves(items)
    .map((leaf) => leaf.menu.path)
    .filter((path) => pathname === path || pathname.startsWith(path + "/"))
    .sort((a, b) => b.length - a.length)[0];
}

/** 菜单项自身或其后代是否命中 activePath。 */
export function menuContains(item: Menu, activePath: string | undefined): boolean {
  if (!activePath) return false;
  return item.children?.length
    ? item.children.some((child) => menuContains(child, activePath))
    : item.path === activePath;
}

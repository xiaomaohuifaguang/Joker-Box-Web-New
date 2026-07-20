import { apiPathKey } from "@/types";
import type { MenuApiPathSaveServer, MenuApiPathServer } from "@/types";

// 由选中集合 + api 关系树构建保存回传的 apiPathTree：
// 仅含选中项，按 server -> 分组 嵌套，apiPath 只保留 path + server。
// 共用于 menu-manager（菜单绑 api）与 role-manager（角色绑 api）的保存。
export function buildApiPathSaveTree(
  tree: MenuApiPathServer[],
  selected: Set<string>,
): MenuApiPathSaveServer[] {
  const result: MenuApiPathSaveServer[] = [];
  for (const svc of tree) {
    const groups: MenuApiPathSaveServer["groups"] = [];
    for (const grp of svc.groups) {
      const apiPaths = grp.apiPaths
        .filter((ap) => selected.has(apiPathKey(ap.server, ap.path)))
        .map((ap) => ({ path: ap.path, server: ap.server }));
      if (apiPaths.length)
        groups.push({ groupName: grp.groupName, apiPaths });
    }
    if (groups.length) result.push({ server: svc.server, groups });
  }
  return result;
}

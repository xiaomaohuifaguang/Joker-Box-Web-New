import type { CodeItem } from "@/types";

// 由扁平码表项构建树（按 sort 升序，按 parentId 嵌套；根 parentId = ""）。
// /code-item/list 返回扁平 List<CodeItem>，树形码表需客户端组树。
export function buildCodeItemTree(flat: CodeItem[]): CodeItem[] {
  const sorted = [...flat].sort((a, b) => a.sort - b.sort);
  const byId = new Map<string, CodeItem>();
  for (const i of sorted) byId.set(i.id, { ...i, children: [] });
  const roots: CodeItem[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children!.push(node);
    else roots.push(node);
  }
  // 叶子节点 children 保持 undefined（与 API 一致）
  const trim = (nodes: CodeItem[]): CodeItem[] =>
    nodes.map((n) => ({
      ...n,
      children: n.children?.length ? trim(n.children) : undefined,
    }));
  return trim(roots);
}

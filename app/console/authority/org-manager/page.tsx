"use client";

import { useState } from "react";
import { useOrgTree } from "@/hooks/useOrgTree";
import { OrgTreePanel } from "./_components/OrgTreePanel";
import { OrgListPanel } from "./_components/OrgListPanel";

// 机构管理：左机构树 + 右列表。树根为后端虚拟节点「全部」(id=-1)，默认选中它查顶级机构。
// 选中任意节点（树或列表面包屑）-> 列表查该节点的子机构。增删改后同时刷新树与列表。
export default function OrgManagerPage() {
  const { tree, loading: treeLoading, refresh: refreshTree } = useOrgTree();
  const [selectedId, setSelectedId] = useState<number>(-1);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  function handleMutated() {
    refreshTree();
    setListRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex h-full overflow-hidden rounded-lg border bg-background">
      <div className="w-80 shrink-0 border-r bg-surface">
        <OrgTreePanel
          tree={tree}
          loading={treeLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {/* key 随选中节点变化 -> 重挂载，重置分页/搜索，避免脏状态 */}
        <OrgListPanel
          key={selectedId}
          parentId={selectedId}
          refreshKey={listRefreshKey}
          tree={tree ?? []}
          onSelect={setSelectedId}
          onMutated={handleMutated}
        />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useOrgTree } from "@/hooks/useOrgTree";
import { getRoleSelector } from "@/lib/api/apiPath";
import { OrgTreePanel } from "@/app/console/authority/_components/OrgTreePanel";
import { UserListPanel } from "./_components/UserListPanel";
import type { SelectOption } from "@/types";

// 用户管理：左机构树（选中机构 -> 按 orgId 过滤用户；虚拟根「全部」= 全部用户）
// + 右列表（搜索 + 角色筛选 + 表格 + 分页）。行操作：编辑（绑定角色/机构）/ 重置密码 / 删除。
// 列表面板 key=selectedId：切换机构时重挂载，重置分页/搜索（与 org-manager 一致）。
// 角色选择器在页面级拉取一次，避免面板重挂载时重复请求。
// 与 org-manager 不同：用户增删不改机构树，故 handleMutated 仅刷新列表。
export default function UserManagerPage() {
  const { tree, loading: treeLoading } = useOrgTree();
  const [selectedId, setSelectedId] = useState<number>(-1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [roles, setRoles] = useState<SelectOption[]>([]);

  useEffect(() => {
    getRoleSelector()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  function handleMutated() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="font-display text-lg font-semibold">用户管理</h1>
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border bg-background">
        <div className="w-80 shrink-0 border-r bg-surface">
          <OrgTreePanel
            tree={tree}
            loading={treeLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <UserListPanel
            key={selectedId}
            orgId={selectedId}
            refreshKey={refreshKey}
            tree={tree ?? []}
            roles={roles}
            onSelectOrg={setSelectedId}
            onMutated={handleMutated}
          />
        </div>
      </div>
    </div>
  );
}

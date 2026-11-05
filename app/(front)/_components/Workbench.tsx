"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/Container";
import { NavTile } from "@/components/NavTile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMenuTree } from "@/hooks/useMenuTree";
import { useUserDisplay } from "@/hooks/useUserDisplay";
import { flattenMenuLeaves } from "@/lib/nav-match";
import { MENU_TYPE } from "@/types";
import { TodoPanel } from "./TodoPanel";

function greeting(hour: number) {
  if (hour < 6) return "夜深了";
  if (hour < 12) return "上午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

// 登录后首页：功能入口由菜单树生成（后端已按权限过滤），有审批中心权限才显示待办。
export function Workbench() {
  const { user, name } = useUserDisplay();
  const { menu, loading } = useMenuTree(MENU_TYPE.FRONT);
  const [hour] = useState(() => new Date().getHours());

  const leaves = flattenMenuLeaves(menu ?? []).filter((l) => l.menu.path !== "/");
  const canApprove = leaves.some(
    (l) => l.menu.path === "/process/approval" || l.menu.path.startsWith("/process/approval/"),
  );

  return (
    <Container className="flex flex-1 flex-col gap-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title font-semibold">
            {greeting(hour)}，{name}
          </h1>
          <p className="text-caption mt-1 text-muted-foreground">
            选一个功能开始，也可以用顶栏搜索直接跳转。
          </p>
        </div>
        {user?.admin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/console">进入后台</Link>
          </Button>
        )}
      </div>

      <div className={canApprove ? "grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : ""}>
        <section aria-labelledby="workbench-apps">
          <h2 id="workbench-apps" className="text-section mb-3 font-semibold">
            功能
          </h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <p className="rounded-lg border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
              你的账号还没有开通功能，请联系管理员。
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {leaves.map((leaf) => (
                <NavTile key={leaf.menu.path} leaf={leaf} />
              ))}
            </div>
          )}
        </section>
        {canApprove && <TodoPanel />}
      </div>
    </Container>
  );
}

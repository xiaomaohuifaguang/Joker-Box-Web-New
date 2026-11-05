"use client";

import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { NavTile } from "@/components/NavTile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayBoardStats } from "@/hooks/useDisplayBoardStats";
import { useMenuTree } from "@/hooks/useMenuTree";
import { flattenMenuLeaves } from "@/lib/nav-match";
import { MENU_TYPE } from "@/types";
import { StatCard } from "./displayBoard/_components/StatCard";

// 后台仪表盘：核心数据 + 按权限生成的管理入口。
export default function ConsolePage() {
  const { people, refresh } = useDisplayBoardStats();
  const { menu, loading } = useMenuTree(MENU_TYPE.CONSOLE);
  const leaves = flattenMenuLeaves(menu ?? []).filter((l) => l.menu.path !== "/console");
  const hasBoard = leaves.some((l) => l.menu.path === "/console/displayBoard");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-page-title font-semibold">仪表盘</h1>
          <p className="text-caption mt-1 text-muted-foreground">查看用户数据，进入各项管理功能。</p>
        </div>
        {hasBoard && (
          <Button asChild variant="outline" size="sm">
            <Link href="/console/displayBoard">查看完整数据</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="系统总用户数"
          value={people.data?.total ?? null}
          loading={people.loading}
          error={people.error}
          onRetry={refresh}
        />
        <StatCard
          icon={UserPlus}
          label="今日注册"
          value={people.data?.todayRegister ?? null}
          loading={people.loading}
          error={people.error}
          onRetry={refresh}
        />
      </div>

      <section aria-labelledby="console-apps">
        <h2 id="console-apps" className="text-section mb-3 font-semibold">
          管理功能
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            : leaves.map((leaf) => <NavTile key={leaf.menu.path} leaf={leaf} />)}
        </div>
      </section>
    </div>
  );
}

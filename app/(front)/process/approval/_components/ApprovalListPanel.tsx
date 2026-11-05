"use client";

import { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import { useProcessInstancePage } from "@/hooks/useProcessInstancePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  APPROVAL_INSTANCE_TABS,
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ApprovalInstanceType,
} from "@/types";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

// 审批列表：tab（待办/待认领/已办）+ 防抖搜索 + 表格 + 分页。
// 操作列按 tab：待办=处理、待认领=认领（均带 taskId 跳详情；认领带 claim 标志），已办=查看。
export function ApprovalListPanel({
  activeTab,
  onTabChange,
  refreshKey,
  processCategory,
  onView,
  onOpenTask,
}: {
  activeTab: ApprovalInstanceType;
  onTabChange: (t: ApprovalInstanceType) => void;
  refreshKey: number;
  /** 流程分类（路由 [type]；不传=全部） */
  processCategory?: string;
  onView: (instanceId: number) => void;
  onOpenTask: (instanceId: number, taskId?: string, claim?: boolean) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  // 外部（父组件）程序化切换 tab 时（如审批操作成功后）也重置到第一页；
  // onValueChange 只在用户点 tab 时触发，受控 prop 变化不触发，故需在 render 期比较。
  const [prevTab, setPrevTab] = useState(activeTab);
  if (prevTab !== activeTab) {
    setPrevTab(activeTab);
    setCurrent(1);
  }
  const [size, setSize] = useState(10);
  const { page, loading } = useProcessInstancePage({
    type: activeTab,
    search,
    current,
    size,
    refreshKey,
    processCategory,
  });

  // 搜索防抖。
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const records = page?.records ?? [];
  const total = page?.total ?? 0;
  // 「任务」列仅待办(2)/待认领(3)显示（taskName 仅这两个 tab 返回；同实例多任务行的关键区分）。
  // 已办(4) 不渲染该列，列数/骨架/空态 colSpan 随之切换。
  const showTask = activeTab === "2" || activeTab === "3";
  const colCount = showTask ? 9 : 8;
  // 骨架屏移动端隐藏列模式（lg 以下只留 编号/标题/任务?/状态/操作）。
  const skeletonHidden = (j: number) =>
    showTask ? j >= 3 && j !== 5 && j !== 8 : j >= 2 && j !== 4 && j !== 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            onTabChange(v as ApprovalInstanceType);
            setCurrent(1);
          }}
        >
          <TabsList>
            {APPROVAL_INSTANCE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索标题 / 编号"
            className="h-9 w-56 pl-8"
          />
        </div>
      </div>

      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>编号</TableHead>
              <TableHead>标题</TableHead>
              {/* 任务列常驻可见（仅待办/待认领渲染）：同实例多任务多行，任务名是行的关键区分信息 */}
              {showTask && (
                <TableHead>任务</TableHead>
              )}
              <TableHead className="hidden lg:table-cell">流程</TableHead>
              <TableHead className="hidden lg:table-cell">版本</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="hidden lg:table-cell">创建时间</TableHead>
              <TableHead className="hidden lg:table-cell">更新时间</TableHead>
              <TableHead className="w-16 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <TableCell
                      key={j}
                      className={skeletonHidden(j) ? "hidden lg:table-cell" : ""}
                    >
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={colCount} title="暂无审批记录" />
            ) : (
              records.map((r) => {
                const st =
                  PROCESS_INSTANCE_STATUS[r.processStatus ?? ""] ??
                  PROCESS_INSTANCE_STATUS_FALLBACK;
                return (
                  // key 用 id+taskId 复合：待办/待认领中同一实例可产生多个任务（多行同 id），单 id 会撞 key。
                  <TableRow key={`${r.id}-${r.taskId ?? ""}`}>
                    <TableCell className="font-mono text-xs font-medium tracking-wide text-foreground/80">
                      <span className="mr-0.5 text-muted-foreground">№</span>
                      {r.code || "-"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm font-medium">
                      {r.title || "-"}
                    </TableCell>
                    {showTask && (
                      <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                        {r.taskName || "-"}
                      </TableCell>
                    )}
                    <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionName || "-"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionVersion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.createTime || "-"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.updateTime || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeTab === "4" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => r.id != null && onView(r.id)}
                          aria-label="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() =>
                            r.id != null &&
                            onOpenTask(r.id, r.taskId, activeTab === "3")
                          }
                        >
                          {activeTab === "3" ? "认领" : "处理"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        current={current}
        size={size}
        total={total}
        onCurrentChange={setCurrent}
        onSizeChange={(s) => {
          setSize(s);
          setCurrent(1);
        }}
      />
    </div>
  );
}

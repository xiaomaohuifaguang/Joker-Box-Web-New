"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil, Search } from "lucide-react";
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
  INSTANCE_TABS,
  PROCESS_INSTANCE_STATUS,
  PROCESS_INSTANCE_STATUS_FALLBACK,
  type ProcessInstanceType,
} from "@/types";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

// 我的流程列表：tab（待处理/进行中/全部/草稿）+ 防抖搜索 + 表格 + 分页。
// 操作列：待处理=处理（带 taskId 进处理视图，对齐审批中心待办），草稿=编辑、其他=查看（跳转路由视图）。
export function InstanceListPanel({
  activeTab,
  onTabChange,
  refreshKey,
  processCategory,
  onView,
  onEdit,
  onOpenTask,
}: {
  activeTab: ProcessInstanceType;
  onTabChange: (t: ProcessInstanceType) => void;
  refreshKey: number;
  /** 流程分类（路由 [type]；不传=全部） */
  processCategory?: string;
  onView: (instanceId: number) => void;
  onEdit: (instanceId: number) => void;
  onOpenTask: (instanceId: number, taskId?: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  // 外部（父组件）程序化切换 tab 时（如发起/存草稿成功后）也重置到第一页；
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            onTabChange(v as ProcessInstanceType);
            setCurrent(1);
          }}
        >
          <TabsList>
            {INSTANCE_TABS.map((t) => (
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
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell
                      key={j}
                      className={j >= 2 && j !== 4 && j !== 7 ? "hidden lg:table-cell" : ""}
                    >
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={8} title="暂无流程记录" />
            ) : (
              records.map((r) => {
                const st =
                  PROCESS_INSTANCE_STATUS[r.processStatus ?? ""] ??
                  PROCESS_INSTANCE_STATUS_FALLBACK;
                return (
                  // key 用 id+taskId 复合：待处理 tab 同一实例可产生多个任务（多行同 id），单 id 会撞 key。
                  <TableRow key={`${r.id}-${r.taskId ?? ""}`}>
                    <TableCell className="font-mono text-xs font-medium tracking-wide text-foreground/80">
                      <span className="mr-0.5 text-muted-foreground">№</span>
                      {r.code || "-"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm font-medium">
                      {r.title || "-"}
                    </TableCell>
                    <TableCell className="hidden max-w-40 truncate text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionName || "-"}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                      {r.processDefinitionVersion || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell tabular-nums">
                      {r.createTime || "-"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell tabular-nums">
                      {r.updateTime || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {activeTab === "6" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => r.id != null && onOpenTask(r.id, r.taskId)}
                        >
                          处理
                        </Button>
                      ) : r.processStatus === "0" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => r.id != null && onEdit(r.id)}
                          aria-label="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => r.id != null && onView(r.id)}
                          aria-label="查看"
                        >
                          <Eye className="h-4 w-4" />
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

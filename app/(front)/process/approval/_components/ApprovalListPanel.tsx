"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { useProcessInstancePage } from "@/hooks/useProcessInstancePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const PAGE_SIZES = [10, 20, 50];

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

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
  const totalPages = Math.max(1, Math.ceil(total / size));
  const pageNumbers = getPageNumbers(current, totalPages);

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
              <TableHead className="text-xs font-medium text-muted-foreground">编号</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">标题</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">流程</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">版本</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground">状态</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">创建时间</TableHead>
              <TableHead className="hidden text-xs font-medium text-muted-foreground lg:table-cell">更新时间</TableHead>
              <TableHead className="w-16 text-right text-xs font-medium text-muted-foreground">操作</TableHead>
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
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={8}
                  className="h-40 text-center text-sm text-muted-foreground"
                >
                  暂无审批记录
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => {
                const st =
                  PROCESS_INSTANCE_STATUS[r.processStatus ?? ""] ??
                  PROCESS_INSTANCE_STATUS_FALLBACK;
                return (
                  <TableRow key={r.id} className="transition-colors hover:bg-felt/10">
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="ml-auto flex items-center gap-1">
          <Select
            value={String(size)}
            onValueChange={(v) => {
              setSize(Number(v));
              setCurrent(1);
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current <= 1}
            onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-1">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === current ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrent(n)}
              >
                {n}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={current >= totalPages}
            onClick={() => setCurrent((c) => Math.min(totalPages, c + 1))}
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

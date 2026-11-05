"use client";

import { useEffect, useState } from "react";
import { Eye, RotateCcw, Search } from "lucide-react";
import { useMailPage } from "@/hooks/useMailPage";
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
import type { MailInfo } from "@/types";
import { MailDetailDialog } from "./_components/MailDetailDialog";
import { DataPagination } from "@/components/DataPagination";
import { TableEmptyRow } from "@/components/TableEmptyRow";

// 邮件记录（只读日志）：列表 + 分页 + 搜索 + 查看详情（HTML 预览 + 变量 JSON）。
export default function MailManagerPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [viewing, setViewing] = useState<MailInfo | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrent(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { page, loading } = useMailPage({ search, current, size });
  const records = page?.records ?? [];
  const total = page?.total ?? 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-page-title font-semibold">邮件记录</h1>
      </div>

      {/* 搜索 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索收件人/主题"
            className="h-9 w-56 pl-8"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setCurrent(1);
          }}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>
      </div>

      {/* 表格 */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>收件人</TableHead>
              <TableHead>主题</TableHead>
              <TableHead>发送时间</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableEmptyRow colSpan={4} title="暂无邮件记录" />
            ) : (
              records.map((mail) => (
                <TableRow key={mail.id} className="group">
                  <TableCell className="font-mono text-xs">{mail.toMail}</TableCell>
                  <TableCell className="max-w-md truncate text-sm font-medium">
                    {mail.subject}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {mail.sendTime}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewing(mail)}
                        aria-label="查看"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
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

      <MailDetailDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        mail={viewing}
      />
    </div>
  );
}

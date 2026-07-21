"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMailInfo } from "@/lib/api/mail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { MailInfo } from "@/types";

// 变量 JSON 美化：解析后 pretty-print，解析失败回退原文。
function prettyJson(str?: string): string {
  if (!str) return "";
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

// 邮件详情弹窗：头部用列表摘要（subject/toMail/sendTime）即时显示，
// 正文 content(HTML) + variable(JSON) 由 /mailInfo/info 拉取。
// HTML 放隔离 iframe（srcDoc + sandbox=""，不跑脚本、不污染页面）。
export function MailDetailDialog({
  open,
  onOpenChange,
  mail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mail: MailInfo | null;
}) {
  const [detail, setDetail] = useState<MailInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 打开/换邮件时回到加载态并清详情（render 期内条件 setState）。
  const mailId = mail?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== mailId) {
    setPrev({ open, id: mailId });
    if (open && mailId !== null) {
      setLoading(true);
      setDetail(null);
    }
  }

  // 拉详情。effect 内只在异步回调 setState。
  useEffect(() => {
    if (!open || mailId === null) return;
    let cancelled = false;
    getMailInfo(mailId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) toast.error("加载邮件详情失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mailId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">{mail?.subject || "邮件详情"}</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              收件人：
              <span className="font-mono text-foreground">{mail?.toMail}</span>
            </span>
            <span>
              发送时间：
              <span className="font-mono text-foreground">{mail?.sendTime}</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* HTML 内容预览（隔离 iframe） */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">邮件内容</div>
          {loading ? (
            <Skeleton className="h-[50vh] w-full rounded border" />
          ) : detail?.content ? (
            <iframe
              srcDoc={detail.content}
              sandbox=""
              title="邮件内容预览"
              className="h-[50vh] w-full rounded border bg-white"
            />
          ) : (
            <div className="flex h-32 items-center justify-center rounded border text-xs text-muted-foreground">
              无内容
            </div>
          )}
        </div>

        {/* 变量 JSON */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">变量（JSON）</div>
          {loading ? (
            <Skeleton className="h-20 w-full rounded border" />
          ) : detail?.variable ? (
            <pre className="max-h-40 overflow-auto rounded border bg-surface p-3 font-mono text-xs">
              {prettyJson(detail.variable)}
            </pre>
          ) : (
            <div className="flex h-16 items-center justify-center rounded border text-xs text-muted-foreground">
              无变量
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

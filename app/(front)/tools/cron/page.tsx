"use client";

import { useMemo, useState } from "react";
import cronstrue from "cronstrue/dist/cronstrue-i18n";
import { parseExpression } from "cron-parser";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AlertCircle, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/RequirePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Container } from "@/components/Container";

const FIELD_LABELS = ["分", "时", "日", "月", "周"] as const;
const FIELD_HINTS = ["0-59", "0-23", "1-31", "1-12", "0-6"];

const PRESETS: { label: string; fields: string[] }[] = [
  { label: "每分钟", fields: ["*", "*", "*", "*", "*"] },
  { label: "每 5 分钟", fields: ["*/5", "*", "*", "*", "*"] },
  { label: "每 10 分钟", fields: ["*/10", "*", "*", "*", "*"] },
  { label: "每小时", fields: ["0", "*", "*", "*", "*"] },
  { label: "每天 0 点", fields: ["0", "0", "*", "*", "*"] },
  { label: "每天 8 点", fields: ["0", "8", "*", "*", "*"] },
  { label: "每周一 9 点", fields: ["0", "9", "*", "*", "1"] },
  { label: "工作日 9 点", fields: ["0", "9", "*", "*", "1-5"] },
  { label: "每月 1 号 0 点", fields: ["0", "0", "1", "*", "*"] },
  { label: "每年 1 月 1 日", fields: ["0", "0", "1", "1", "*"] },
];

export default function CronPage() {
  const [fields, setFields] = useState<string[]>(["0", "0", "*", "*", "*"]);
  const [copied, setCopied] = useState(false);

  const cron = fields.join(" ");

  // 实时计算描述 + 接下来 5 次触发；非法表达式给错误。
  const { description, nextRuns, error } = useMemo(() => {
    try {
      const description = cronstrue.toString(cron, { locale: "zh_CN" });
      const iter = parseExpression(cron);
      const nextRuns: Date[] = [];
      for (let i = 0; i < 5; i++) nextRuns.push(iter.next().toDate());
      return { description, nextRuns, error: null as string | null };
    } catch (e) {
      return {
        description: null,
        nextRuns: [] as Date[],
        error: (e as Error).message,
      };
    }
  }, [cron]);

  function updateField(i: number, v: string) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? v : f)));
  }
  async function copy() {
    await navigator.clipboard.writeText(cron);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("已复制");
  }

  return (
    <RequirePermission>
    <Container className="flex flex-col gap-6 py-8 md:py-12">
        <div>
          <h1 className="font-display text-lg font-semibold">
            cron 时间表达式转换
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            5 段：分 时 日 月 周。选预设或自定义，实时看描述与下次触发。
          </p>
        </div>

        {/* 5 段输入 + 合并表达式 */}
        <div className="flex flex-wrap items-end gap-3">
          {FIELD_LABELS.map((label, i) => (
            <div key={label} className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                {label} <span className="font-mono">{FIELD_HINTS[i]}</span>
              </Label>
              <Input
                value={fields[i]}
                onChange={(e) => updateField(i, e.target.value)}
                className="h-10 w-20 text-center font-mono"
                spellCheck={false}
              />
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-md border bg-surface px-3 py-2">
            <span className="font-mono text-sm">{cron}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copy}
              aria-label="复制表达式"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-brand" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* 预设 */}
        <div>
          <div className="mb-2 text-xs text-muted-foreground">常用预设</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = p.fields.join(" ") === cron;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setFields(p.fields)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-brand bg-brand/10 text-brand"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 描述（招牌） */}
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-sm font-medium">表达式无效</div>
              <div className="mt-0.5 text-xs">{error}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-surface p-5">
            <div className="text-xs text-muted-foreground">执行说明</div>
            <div className="mt-1 font-display text-2xl font-semibold">
              {description}
            </div>
          </div>
        )}

        {/* 接下来 5 次触发 */}
        {!error && nextRuns.length > 0 && (
          <div>
            <div className="mb-2 text-xs text-muted-foreground">
              接下来 5 次触发
            </div>
            <div className="flex flex-col divide-y rounded-lg border">
              {nextRuns.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-4 font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm">
                    {format(d, "yyyy-MM-dd HH:mm:ss")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(d, "EEEE", { locale: zhCN })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </Container>
    </RequirePermission>
  );
}

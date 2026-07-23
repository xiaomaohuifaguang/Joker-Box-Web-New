"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clearable, type FieldControlProps } from "./registry";

// 日期范围（DATERANGE）：值 = [start, end] 字符串数组（可为空数组/undefined）。
// date-only 存 yyyy-MM-dd；props.withTime===true 时存 yyyy-MM-dd HH:mm（日历下方加时间 Input）。
// 结束 < 开始 不在此强制，由校验层（validate.ts）处理。

// 单个端点选择器：复刻 DateControl 的 Popover + Calendar 模式。
function RangeEndpointPicker({
  value,
  onChange,
  placeholder,
  disabled,
  withTime,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  withTime: boolean;
}) {
  const date = value ? new Date(value.replace(" ", "T")) : undefined;
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full min-w-0 flex-1 justify-start font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (!d) return;
            const base = format(d, "yyyy-MM-dd");
            onChange(withTime ? `${base} ${format(d, "HH:mm")}` : base);
            if (!withTime) setOpen(false);
          }}
        />
        {withTime && (
          <div className="border-t p-2">
            <Input
              type="time"
              value={value.includes(" ") ? value.split(" ")[1] : ""}
              onChange={(e) => {
                const base = value ? value.split(" ")[0] : format(new Date(), "yyyy-MM-dd");
                onChange(`${base} ${e.target.value}`);
              }}
              className="bg-background text-foreground dark:[color-scheme:dark]"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function DateRangeControl({ value, onChange, disabled, field }: FieldControlProps) {
  const withTime = field.props?.withTime === true;
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const start = arr[0] ?? "";
  const end = arr[1] ?? "";
  return (
    <Clearable
      show={!disabled && (start !== "" || end !== "")}
      onClear={() => onChange(undefined)}
    >
      <div className="flex items-center gap-2">
        <RangeEndpointPicker
          value={start}
          onChange={(s) => onChange([s, end])}
          placeholder="开始日期"
          disabled={disabled}
          withTime={withTime}
        />
        <span className="shrink-0 text-muted-foreground">至</span>
        <RangeEndpointPicker
          value={end}
          onChange={(e) => onChange([start, e])}
          placeholder="结束日期"
          disabled={disabled}
          withTime={withTime}
        />
      </div>
    </Clearable>
  );
}

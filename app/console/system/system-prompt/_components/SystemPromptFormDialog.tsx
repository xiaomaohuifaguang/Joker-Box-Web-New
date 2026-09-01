"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { addSysPrompt } from "@/lib/api/systemPrompt";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { prompt: "", deadTime: "" };

// 新增系统提示（全局公告）。prompt + deadTime 均必填，无编辑（接口未提供 update）。
// deadTime 内部存 "yyyy-MM-dd HH:mm"（Calendar 选日期 + time Input 选时分），提交时补 ":00" 秒。
export function SystemPromptFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 每次打开重置为空表单（render 期内条件 setState，避免 effect 内同步 setState）。
  const [prevOpen, setPrevOpen] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setForm(EMPTY);
      setPickerOpen(false);
    }
  }

  const deadDate = form.deadTime
    ? new Date(form.deadTime.replace(" ", "T"))
    : undefined;

  async function submit() {
    if (!form.prompt.trim()) {
      toast.error("请输入提示消息");
      return;
    }
    if (!form.deadTime) {
      toast.error("请选择截止时间");
      return;
    }
    setBusy(true);
    try {
      await addSysPrompt({
        prompt: form.prompt.trim(),
        deadTime: `${form.deadTime}:00`,
      });
      toast.success("已新增");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新增系统提示</DialogTitle>
          <DialogDescription>
            发布一条全局公告，到达截止时间后失效。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">提示消息 *</Label>
            <Textarea
              value={form.prompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, prompt: e.target.value }))
              }
              placeholder="公告内容"
              className="field-sizing-fixed h-40 resize-y"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-muted-foreground">截止时间 *</Label>
            {/* Popover + Calendar + time Input（同 DateRangeControl 模式）。
                Calendar 无滚轮需求，不踩 Dialog 内 Popover 滚轮被挡的坑。 */}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-56 justify-start font-normal",
                    !form.deadTime && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {form.deadTime || "选择截止时间"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadDate}
                  onSelect={(d) => {
                    if (!d) return;
                    const base = format(d, "yyyy-MM-dd");
                    // 保留已输入的时间：Calendar onSelect 给的是当日 0 点 Date。
                    const keep =
                      (form.deadTime.includes(" ")
                        ? form.deadTime.split(" ")[1]
                        : "") || "00:00";
                    setForm((f) => ({ ...f, deadTime: `${base} ${keep}` }));
                  }}
                />
                <div className="border-t p-2">
                  <Input
                    type="time"
                    value={
                      form.deadTime.includes(" ")
                        ? form.deadTime.split(" ")[1]
                        : ""
                    }
                    onChange={(e) => {
                      const base = form.deadTime
                        ? form.deadTime.split(" ")[0]
                        : format(new Date(), "yyyy-MM-dd");
                      setForm((f) => ({
                        ...f,
                        deadTime: `${base} ${e.target.value}`,
                      }));
                    }}
                    className="bg-background text-foreground dark:[color-scheme:dark]"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

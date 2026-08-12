"use client";

import { useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// 输入区：单张圆角作曲卡（textarea 无边框内嵌，发送钮嵌右下），Enter 发送 / Shift+Enter 换行。
// 流式中发送钮原位变停止钮（同圆槽，不跳动）。焦点环落在整张卡上（focus-within），而非字段本身。
export function AiChatInput({
  streaming, disabled, onSend, onStop,
}: {
  streaming: boolean;
  disabled: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const canSend = !disabled && !streaming && value.trim().length > 0;

  function submit() {
    const t = value.trim();
    if (!t || streaming || disabled) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="p-3 pt-1">
      {/* 作曲卡：边框+底是一个整体；focus-within 把环落在卡上，内部 textarea 去边框去环。 */}
      <div
        className={cn(
          "rounded-xl border border-input bg-muted/40 shadow-xs transition-[box-shadow,border-color]",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "opacity-60",
        )}
      >
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // IME 组合中（拼音选词）按 Enter 不发送。
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="输入消息…"
          disabled={disabled}
          className={cn(
            "max-h-40 min-h-11 resize-none border-0 bg-transparent px-3 pt-2.5 pb-1 text-sm shadow-none",
            "focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
          )}
        />
        {/* 卡内底行：左侧常驻键位提示，右侧圆形发送/停止钮。 */}
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
          <p className="select-none pl-0.5 text-[11px] leading-none text-muted-foreground/70">
            <kbd className="font-sans">Enter</kbd> 发送 · <kbd className="font-sans">Shift+Enter</kbd> 换行
          </p>
          {streaming ? (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={onStop}
              aria-label="停止"
              title="停止生成"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={submit}
              disabled={!canSend}
              aria-label="发送"
              title="发送"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

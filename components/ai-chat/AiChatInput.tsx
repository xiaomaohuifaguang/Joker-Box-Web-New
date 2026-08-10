"use client";

import { useState } from "react";
import { SendHorizonal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 输入区：Enter 发送 / Shift+Enter 换行；流式中发送钮变停止钮。
export function AiChatInput({
  streaming, disabled, onSend, onStop,
}: {
  streaming: boolean;
  disabled: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (!t || streaming || disabled) return;
    onSend(t);
    setValue("");
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
          rows={2}
          disabled={disabled}
          className="max-h-32 resize-none text-sm"
        />
        {streaming ? (
          <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={onStop} aria-label="停止">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={submit} disabled={disabled || !value.trim()} aria-label="发送">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

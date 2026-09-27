"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

// 带显隐切换的密码输入框：右侧眼睛按钮，保持 Input 全部原生属性透传（供 RHF field 展开）。
export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        className="pr-9"
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={show ? "隐藏密码" : "显示密码"}
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

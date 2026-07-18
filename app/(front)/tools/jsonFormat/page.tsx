"use client";

import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { AlertCircle, Check, Copy, Maximize2, Minimize2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { JsonTree } from "./_components/JsonTree";

const SAMPLE = `{"name":"Joker Box","tags":["tools","platform"],"version":1,"active":true,"meta":{"owner":null,"created":"2026-01-01"}}`;

export default function JsonFormatPage() {
  const { scheme } = useTheme();
  const [value, setValue] = useState(SAMPLE);
  const [copied, setCopied] = useState(false);

  // 实时解析：有效则给树，无效则给错误。
  const { parsed, error } = useMemo(() => {
    if (!value.trim()) return { parsed: undefined, error: null };
    try {
      return { parsed: JSON.parse(value) as unknown, error: null };
    } catch (e) {
      return { parsed: undefined, error: (e as Error).message };
    }
  }, [value]);

  function format() {
    try {
      setValue(JSON.stringify(JSON.parse(value), null, 2));
      toast.success("已格式化");
    } catch {
      toast.error("JSON 无效，无法格式化");
    }
  }
  function minify() {
    try {
      setValue(JSON.stringify(JSON.parse(value)));
      toast.success("已压缩");
    } catch {
      toast.error("JSON 无效，无法压缩");
    }
  }
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("已复制");
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-lg font-semibold">JSON 格式化</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={format}>
            <Maximize2 className="h-4 w-4" />
            格式化
          </Button>
          <Button variant="outline" size="sm" onClick={minify}>
            <Minimize2 className="h-4 w-4" />
            压缩
          </Button>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            复制
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setValue("")}
            className="text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            清空
          </Button>
        </div>
      </div>

      <div className="flex h-[70vh] flex-col gap-3 md:flex-row">
        {/* 编辑器 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
            输入
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={value}
              onChange={setValue}
              extensions={[json()]}
              theme={scheme === "dark" ? "dark" : "light"}
              height="100%"
            />
          </div>
        </div>

        {/* 结构树 */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border">
          <div className="border-b px-3 py-1.5 text-xs text-muted-foreground">
            结构
          </div>
          <div className="flex-1 overflow-auto p-3">
            {error ? (
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            ) : parsed !== undefined ? (
              <JsonTree data={parsed} />
            ) : (
              <p className="text-sm text-muted-foreground">
                粘贴 JSON 后这里显示结构化树。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

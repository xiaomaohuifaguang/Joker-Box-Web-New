import { Fragment, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Check, Copy, SquareTerminal } from "lucide-react";
import { toast } from "sonner";
import { AiMarkdown } from "@/components/ai-chat/AiMarkdown";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import type { SampleCode } from "@/types";
import { SAMPLE_FILE_MAP, SAMPLE_FILES, type SampleCodeKey } from "./files";

interface CodePreviewProps {
  result: SampleCode | null;
  /** 生成中：清空旧结果后显加载态 */
  loading: boolean;
  activeKey: SampleCodeKey;
  onActiveChange: (key: SampleCodeKey) => void;
}

// 右侧预览区：生成中 → 加载态；未生成 → 空态；已生成 → tab 切换 + 只读 CodeMirror + 复制当前文件。
export function CodePreview({ result, loading, activeKey, onActiveChange }: CodePreviewProps) {
  const { scheme } = useTheme();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-1 flex-col items-center justify-center gap-3 rounded-lg border text-sm text-muted-foreground lg:h-[calc(100svh-8rem)]">
        <Spinner className="size-6" />
        正在生成代码…
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-[40vh] flex-1 flex-col">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SquareTerminal />
            </EmptyMedia>
            <EmptyTitle>暂无生成结果</EmptyTitle>
            <EmptyDescription>
              在左侧输入数据库表名并点击「生成」，这里会分文件展示生成的前后端代码。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const meta = SAMPLE_FILE_MAP[activeKey];
  const code = result[activeKey] ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    // 高度用确定的视口值（jsonFormat 同款做法），CodeMirror 内部自行滚动；
    // 不依赖 console 滚动容器里的 h-full flex 链（会把编辑器撑成内容高度导致看不全）。
    <div className="flex h-[70vh] flex-1 flex-col overflow-hidden rounded-lg border lg:h-[calc(100svh-8rem)]">
      <Tabs
        value={activeKey}
        onValueChange={(v) => onActiveChange(v as SampleCodeKey)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="flex items-center gap-2 border-b pr-2">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <TabsList variant="line" className="w-max">
              {SAMPLE_FILES.map((f, i) => (
                <Fragment key={f.key}>
                  {/* 前后端两组之间的分隔线 */}
                  {i > 0 && SAMPLE_FILES[i - 1].group !== f.group && (
                    <div className="mx-1 h-5 w-px self-center bg-border" />
                  )}
                  <TabsTrigger value={f.key}>{f.label}</TabsTrigger>
                </Fragment>
              ))}
            </TabsList>
          </div>
          <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
            {meta.filename}
          </span>
          <Button variant="ghost" size="sm" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            复制
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {meta.markdown ? (
            // markdown 说明类内容：渲染而非源码展示（复用 AI 对话的 AiMarkdown，自带 prose 主题）
            <div className="h-full overflow-auto p-4">
              <AiMarkdown content={code} />
            </div>
          ) : (
            /* key 切文件时重挂载编辑器，语言扩展随文件类型切换。
               className=h-full 给外层容器定高——@uiw/react-codemirror 的 height 只作用于 .cm-editor，
               容器本身默认 height:auto，不定高会导致编辑器随内容撑高、内部滚动失效 */
            <CodeMirror
              key={activeKey}
              className="h-full"
              value={code}
              readOnly
              extensions={meta.extension ? [meta.extension] : []}
              theme={scheme === "dark" ? "dark" : "light"}
              height="100%"
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}

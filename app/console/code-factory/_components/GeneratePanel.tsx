import { useState } from "react";
import { Download, FileCode2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { downloadSampleCodeZip } from "@/lib/api/codeFactory";
import { cn } from "@/lib/utils";
import type { SampleCode } from "@/types";
import { SAMPLE_FILES, type SampleCodeKey } from "./files";

interface GeneratePanelProps {
  tableName: string;
  onTableNameChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  result: SampleCode | null;
  /** 生成时锁定的表名（下载压缩包用） */
  generatedName: string | null;
  activeKey: SampleCodeKey;
  onSelect: (key: SampleCodeKey) => void;
}

const GROUP_LABELS = { backend: "后端", frontend: "前端", doc: "说明" } as const;

// 左侧生成面板：表名输入 + 生成按钮；生成成功后列出文件清单（点击与右侧 tab 联动）。
export function GeneratePanel({
  tableName,
  onTableNameChange,
  onGenerate,
  loading,
  result,
  generatedName,
  activeKey,
  onSelect,
}: GeneratePanelProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!generatedName || downloading) return;
    setDownloading(true);
    try {
      await downloadSampleCodeZip(generatedName);
      toast.success("压缩包已下载");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="shrink-0 lg:w-80">
      <CardHeader>
        <CardTitle>代码生成器</CardTitle>
        <CardDescription>
          输入数据库表名，一键生成前后端示例代码。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onGenerate();
          }}
        >
          <Input
            value={tableName}
            onChange={(e) => onTableNameChange(e.target.value)}
            placeholder="如 sys_user"
            disabled={loading}
            className="font-mono"
          />
          <Button type="submit" disabled={loading || !tableName.trim()}>
            {loading && <Spinner />}
            生成
          </Button>
        </form>

        {result && (
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
            >
              {downloading ? <Spinner /> : <Download />}
              下载压缩包（ZIP）
            </Button>
            {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map(
              (group) => (
                <div key={group}>
                  <div className="mb-1 px-2 text-xs text-muted-foreground">
                    {GROUP_LABELS[group]}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {SAMPLE_FILES.filter((f) => f.group === group).map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => onSelect(f.key)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                          f.key === activeKey && "bg-accent font-medium",
                        )}
                      >
                        {f.markdown ? (
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <FileCode2 className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm">{f.label}</span>
                        <span className="ml-auto truncate font-mono text-xs text-muted-foreground">
                          {f.filename}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

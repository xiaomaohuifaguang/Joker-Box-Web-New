"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { generateSampleCode } from "@/lib/api/codeFactory";
import type { SampleCode } from "@/types";
import { CodePreview } from "./_components/CodePreview";
import { GeneratePanel } from "./_components/GeneratePanel";
import type { SampleCodeKey } from "./_components/files";

// 代码工厂：输入表名 → POST /rapidDevelopment/generate → 分文件预览/复制。
// 权限由 console layout 的 RequireAdmin 统一守（需在菜单管理注册 /console/code-factory）。
export default function CodeFactoryPage() {
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleCode | null>(null);
  const [activeKey, setActiveKey] = useState<SampleCodeKey>("entity");
  // 生成时锁定的表名——下载压缩包用它，避免生成后再改输入框导致名不对。
  const [generatedName, setGeneratedName] = useState<string | null>(null);

  async function handleGenerate() {
    const name = tableName.trim();
    if (!name || loading) return;
    // 先清空上次结果——生成期间预览区显加载态，左栏清单/下载按钮随之隐藏。
    setResult(null);
    setGeneratedName(null);
    setLoading(true);
    try {
      const data = await generateSampleCode(name);
      setResult(data);
      setGeneratedName(name);
      setActiveKey("entity");
      toast.success("生成成功");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <GeneratePanel
        tableName={tableName}
        onTableNameChange={setTableName}
        onGenerate={handleGenerate}
        loading={loading}
        result={result}
        generatedName={generatedName}
        activeKey={activeKey}
        onSelect={setActiveKey}
      />
      <CodePreview
        result={result}
        loading={loading}
        activeKey={activeKey}
        onActiveChange={setActiveKey}
      />
    </div>
  );
}

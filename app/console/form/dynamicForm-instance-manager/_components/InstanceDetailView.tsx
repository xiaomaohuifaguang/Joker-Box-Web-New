"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { getDynamicFormInstanceInfo } from "@/lib/api/dynamicForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";
import type { DynamicForm } from "@/types";
import { DynamicFormRenderer } from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";

// 实例详情（只读预览）：拉 /dynamicForm/instance/info，字段 value 回填 + defaultValue 兜底，
// linkageRules=[] + disabled 整表只读（实例详情接口不返回联动规则）。
export function InstanceDetailView({
  instanceId,
  onBack,
}: {
  instanceId: string;
  onBack: () => void;
}) {
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // instanceId 变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
  const [prevId, setPrevId] = useState(instanceId);
  if (prevId !== instanceId) {
    setPrevId(instanceId);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    getDynamicFormInstanceInfo(instanceId)
      .then((data) => {
        if (cancelled) return;
        setForm(data);
        // 组受控 values：实例值优先，缺省回退字段默认值（valueOf 也会兜底 defaultValue）。
        const v: Record<string, unknown> = {};
        const all = [
          ...(data.fields ?? []),
          ...(data.groups ?? []).flatMap((g) => g.fields),
        ];
        for (const f of all) {
          if (f.value !== undefined) v[f.fieldId] = f.value;
        }
        setValues(v);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  return (
    <div className="flex flex-col gap-4">
      {/* 头部：返回 + 标题 + 元信息（不随表单收窄，保持后台布局） */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <h1 className="font-display text-lg font-semibold">
          {form?.name ?? "实例详情"}
        </h1>
        {form?.version && (
          <span className="font-mono text-xs text-muted-foreground">v{form.version}</span>
        )}
      </div>
      {form?.description && (
        <p className="text-sm text-muted-foreground">{form.description}</p>
      )}

      {/* 表单区：宽度与前台填表页一致（Container：85% / max 1600 居中） */}
      {loading ? (
        <Container>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Container>
      ) : error ? (
        <div className="flex items-center justify-center rounded-lg border py-24">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : form ? (
        <Container className="mt-2">
          <DynamicFormRenderer
            fields={form.fields ?? []}
            groups={form.groups ?? []}
            linkageRules={[]}
            values={values}
            errors={{}}
            onChange={() => {}}
            disabled
          />
        </Container>
      ) : null}
    </div>
  );
}

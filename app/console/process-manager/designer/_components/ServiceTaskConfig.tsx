"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDelegateExpressions } from "@/lib/api/process";
import type { SelectOption } from "@/types";
import type { ProcessFlowNode, ProcessNodeData } from "./nodes";

// 服务任务（serviceTask）属性配置：delegateExpression 委托表达式（下拉，远程拉取）+ async 异步开关。
// 值入 node.data（delegateExpression=string / async=boolean），保存时随 rawData 入 rawData。
export function ServiceTaskConfig({
  node,
  readOnly,
  onChange,
}: {
  node: ProcessFlowNode;
  readOnly: boolean;
  onChange: (patch: Partial<ProcessNodeData>) => void;
}) {
  const d = node.data;
  const delegateExpression = d.delegateExpression ?? "";
  const isAsync = d.async ?? false;

  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // 委托表达式选项：挂载拉一次。
  useEffect(() => {
    let cancelled = false;
    getDelegateExpressions()
      .then((list) => !cancelled && setOptions(list))
      .catch(() => !cancelled && setOptions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">委托表达式</Label>
        <Select
          value={delegateExpression}
          onValueChange={(v) => onChange({ delegateExpression: v })}
          disabled={readOnly || loading}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={loading ? "加载中…" : "选择委托表达式"} />
          </SelectTrigger>
          <SelectContent position="popper">
            {options.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="service-async" className="text-xs">异步开启</Label>
        <Switch
          id="service-async"
          checked={isAsync}
          disabled={readOnly}
          onCheckedChange={(c) => onChange({ async: c === true })}
        />
      </div>
    </div>
  );
}

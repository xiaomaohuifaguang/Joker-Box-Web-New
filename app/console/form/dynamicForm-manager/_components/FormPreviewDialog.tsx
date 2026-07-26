"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Braces } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DesignerState } from "./designer-state";
import {
  DynamicFormRenderer,
  type DynamicFormRendererHandle,
} from "./DynamicFormRenderer";

// 预览：真实控件按 24 栅格渲染（可交互 + 提交校验 + 分组可折叠）。渲染引擎见 DynamicFormRenderer。
export function FormPreviewDialog({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: DesignerState;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dataOpen, setDataOpen] = useState(false);
  // 「查看数据」弹层里展示的 JSON 文本：点开时快照（避免渲染期读 ref）。
  const [dataJson, setDataJson] = useState("");
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  function setValue(fieldId: string, v: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
    // 改值即清该字段错误。
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function submit() {
    const nextErrors = rendererRef.current?.validate() ?? {};
    setErrors(nextErrors);
    const count = Object.keys(nextErrors).length;
    if (count === 0) {
      toast.success("校验通过");
    } else {
      toast.error(`${count} 个字段校验未通过`);
    }
  }

  function reset() {
    setValues({});
    setErrors({});
    rendererRef.current?.clearEdgeTriggers(); // 清 VALUE 边沿，reset 后按初始态重新触发
  }

  function collectData() {
    return rendererRef.current?.collectData() ?? {};
  }

  function openDataDialog() {
    setDataJson(JSON.stringify(collectData(), null, 2));
    setDataOpen(true);
  }

  function copyData() {
    navigator.clipboard
      .writeText(dataJson)
      .then(() => toast.success("已复制"))
      .catch(() => toast.error("复制失败"));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{state.name || "未命名表单"}</DialogTitle>
          </DialogHeader>
          {state.description && (
            <p className="text-sm text-muted-foreground">{state.description}</p>
          )}
          <div className="mt-2">
            <DynamicFormRenderer
              ref={rendererRef}
              fields={state.fields}
              groups={state.groups}
              linkageRules={state.linkageRules ?? []}
              values={values}
              errors={errors}
              onChange={setValue}
            />
          </div>
          {[...state.fields, ...state.groups.flatMap((g) => g.fields)].length > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                重置
              </Button>
              <Button variant="outline" onClick={openDataDialog}>
                <Braces className="h-4 w-4" />
                查看数据
              </Button>
              <Button onClick={submit}>提交</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 查看数据：fieldId -> 当前值 的 JSON 结构。嵌套 Dialog。 */}
      <Dialog open={dataOpen} onOpenChange={setDataOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>表单数据</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
            {dataJson}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={copyData}>
              复制
            </Button>
            <Button onClick={() => setDataOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

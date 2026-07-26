"use client";

import { Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorState } from "@/components/ErrorState";
import { Container } from "@/components/Container";
import { Button } from "@/components/ui/button";
import { useDynamicFormFill } from "@/hooks/useDynamicFormFill";
import {
  DynamicFormRenderer,
  type DynamicFormRendererHandle,
} from "@/app/console/form/dynamicForm-manager/_components/DynamicFormRenderer";

// 前台动态表单填写页：/dynamicForm?formId=&version=。需登录。
// 渲染引擎复用设计器的 DynamicFormRenderer；提交走 /dynamicForm/submit。
export default function DynamicFormPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <DynamicFormFill />
      </Suspense>
    </RequireAuth>
  );
}

function DynamicFormFill() {
  const params = useSearchParams();
  const formId = params.get("formId");
  const version = params.get("version");
  const { status, form, loadError, values, errors, setValue, submit, refill } =
    useDynamicFormFill(formId, version);
  const rendererRef = useRef<DynamicFormRendererHandle>(null);

  if (status === "loading") {
    return (
      <Container className="flex flex-1 items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </Container>
    );
  }
  if (status === "error" || !form) {
    return (
      <ErrorState
        code="404"
        title="表单不可用"
        message={loadError ?? "这张表单不存在或已下线。"}
      />
    );
  }

  // 提交成功：成功态 + 再填一次（重拉 info）。
  if (status === "submitted") {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="mt-4 font-display text-2xl font-semibold">提交成功</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          「{form.name}」已收到你的填写。
        </p>
        <Button className="mt-6" onClick={() => { rendererRef.current?.clearEdgeTriggers(); refill(); }}>
          再填一次
        </Button>
      </Container>
    );
  }

  const allFields = [...(form.fields ?? []), ...(form.groups ?? []).flatMap((g) => g.fields)];
  const submitting = status === "submitting";

  return (
    <Container className="flex-1 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{form.name}</h1>
      {form.description && (
        <p className="mt-2 text-sm text-muted-foreground">{form.description}</p>
      )}
      <div className="mt-6">
        <DynamicFormRenderer
          ref={rendererRef}
          fields={form.fields ?? []}
          groups={form.groups ?? []}
          linkageRules={form.linkageRules ?? []}
          values={values}
          errors={errors}
          onChange={setValue}
        />
      </div>
      {allFields.length > 0 && (
        <div className="mt-8 flex items-center gap-3">
          <Button
            onClick={() =>
              void submit(
                () => rendererRef.current?.validate() ?? {},
                () => rendererRef.current?.collectData() ?? {},
              )
            }
            disabled={submitting}
          >
            {submitting ? "提交中…" : "提交"}
          </Button>
        </div>
      )}
    </Container>
  );
}

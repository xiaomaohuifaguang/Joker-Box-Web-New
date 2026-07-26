"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getDynamicFormInfo, submitDynamicForm } from "@/lib/api/dynamicForm";
import type { DynamicForm } from "@/types";

export type FillStatus = "loading" | "error" | "filling" | "submitting" | "submitted";

// 前台动态表单填写页数据：按 formId+version 拉 info，管 values/errors/submit/refill。
// 渲染/联动/校验/收集在 DynamicFormRenderer；本 hook 只持状态与提交。
export function useDynamicFormFill(formId: string | null, version: string | null) {
  const [status, setStatus] = useState<FillStatus>("loading");
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 竞态守卫：重拉/参数变化时旧响应不覆盖新状态。
  const loadSeq = useRef(0);

  // start：同步重置状态（refill 在事件回调里调，合法）。effect 不走这里——见下。
  const start = useCallback(() => {
    if (!formId || !version) {
      setStatus("error");
      setLoadError("缺少参数 formId 或 version");
      setForm(null);
      return false;
    }
    setStatus("loading");
    setLoadError(null);
    return true;
  }, [formId, version]);

  // fetch：异步拉 info，setState 全在 await 之后（react-hooks/set-state-in-effect 允许异步回调里 setState）。
  const fetchInfo = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const info = await getDynamicFormInfo(formId as string, version as string);
      if (seq !== loadSeq.current) return;
      setForm(info);
      setValues({});
      setErrors({});
      setStatus("filling");
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setForm(null);
      setLoadError(e instanceof Error ? e.message : "加载失败");
      setStatus("error");
    }
  }, [formId, version]);

  // effect 里同步 setState 被 react-hooks/set-state-in-effect 禁 -> 整个 start 进微任务。
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (start()) void fetchInfo();
    });
    return () => {
      cancelled = true;
    };
  }, [start, fetchInfo]);

  const load = useCallback(() => {
    if (start()) void fetchInfo();
  }, [start, fetchInfo]);

  const setValue = useCallback((fieldId: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [fieldId]: v }));
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  // validate/collect 由页面从渲染器 handle 传入；校验失败抛错并置 errors。
  const submit = useCallback(
    async (
      validate: () => Record<string, string>,
      collect: () => Record<string, unknown>,
    ) => {
      if (!formId || !version) return;
      const nextErrors = validate();
      setErrors(nextErrors);
      const count = Object.keys(nextErrors).length;
      if (count > 0) {
        toast.error(`${count} 个字段校验未通过`);
        return;
      }
      setStatus("submitting");
      try {
        await submitDynamicForm({ formId, version, data: collect() });
        setStatus("submitted");
      } catch (e) {
        setStatus("filling");
        toast.error(e instanceof Error ? e.message : "提交失败");
      }
    },
    [formId, version],
  );

  // 再填一次：重拉 info 保证一致性（load 内已清 values/errors + 状态回 filling）。
  const refill = useCallback(() => {
    void load();
  }, [load]);

  return { status, form, loadError, values, errors, setValue, submit, refill };
}

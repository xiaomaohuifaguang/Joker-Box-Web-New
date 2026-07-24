"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type {
  DynamicFormField,
  DynamicFormOption,
  DynamicFormOptionMapping,
} from "@/types/dynamic-form";
import { collectDeps, mapOptions, substituteParams } from "./optionSource";

// 预览/填表运行时的远程选项拉取（optionSource.type==="API" 的字段）：
// - 依赖（params 里的 ${fieldId} 占位）值变化 -> 请求 key 变化 -> 重拉。
// - 依赖值有空（undefined/""）-> 跳过请求，optionsOf 返回 undefined（调用方回退手动 options）。
// - 成功（含空数组）才存结果；失败 toast + 不存（回退手动）。空数组是成功（显示「暂无可用选项」）。
// - 值优先级：optionsOf 仅在有「当前 key 对应的成功结果」时返回远程 options，否则 undefined。

// 一次远程选项请求的描述。key 唯一标识请求内容（url+method+替换后参数），用于去重/过期判定/竞态。
interface RemoteRequest {
  fieldId: string;
  key: string;
  url: string;
  method: "GET" | "POST";
  params: Record<string, unknown>;
  mapping?: DynamicFormOptionMapping;
}

// 字段当前应发的请求；非 API / 无 url / 依赖有空值 -> null（跳过，回退手动 options）。
function buildRequest(
  f: DynamicFormField,
  values: Record<string, unknown>,
): RemoteRequest | null {
  const src = f.optionSource;
  if (src?.type !== "API" || !src.url) return null;
  const deps = collectDeps(src.params);
  if (deps.some((d) => values[d] === undefined || values[d] === "")) return null;
  const params = substituteParams(src.params, values);
  const method = src.method ?? "GET";
  // key 含替换后的完整参数：依赖值变 -> key 变 -> 重拉。
  const key = JSON.stringify([src.url, method, params]);
  return {
    fieldId: f.fieldId,
    key,
    url: src.url,
    method,
    params,
    mapping: src.mapping,
  };
}

// 仅允许同源相对路径（/joker-box 代理前缀由 api client 统一加）：非 / 开头或含 :// 一律拒绝。
function isValidUrl(url: string): boolean {
  return url.startsWith("/") && !url.includes("://");
}

// GET query 只收 string/number/undefined：boolean/数组等转字符串，null/undefined 跳过。
function toQuery(
  params: Record<string, unknown>,
): Record<string, string | number | undefined> {
  const q: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    q[k] = typeof v === "string" || typeof v === "number" ? v : String(v);
  }
  return q;
}

export function useRemoteOptions(
  fields: DynamicFormField[],
  values: Record<string, unknown>,
): {
  optionsOf: (f: DynamicFormField) => DynamicFormOption[] | undefined;
  loading: (fieldId: string) => boolean;
} {
  // fieldId -> 最近一次成功的结果（key 用于过期判定：依赖变了，旧 key 的结果不能再用）。
  const [fetched, setFetched] = useState<
    Map<string, { key: string; options: DynamicFormOption[] }>
  >(new Map());
  // fetched 的 ref 镜像：effect 内同步读（state 读不到本次渲染后的值）。
  const fetchedRef = useRef(fetched);
  // 加载中集合（loading() 展示用）。
  const [loadingSet, setLoadingSet] = useState<Set<string>>(new Set());
  // fieldId -> 进行中的请求 key（防同 key 重发）。
  const inflightRef = useRef<Map<string, string>>(new Map());
  // fieldId -> 最近发起的请求 key（竞态守卫：响应回来时不是最新 key 则丢弃，后发覆盖先发）。
  const latestKeyRef = useRef<Map<string, string>>(new Map());
  // 非法 url 的字段只 toast 一次。
  const warnedRef = useRef<Set<string>>(new Set());

  // 每次渲染按当前值算请求（纯函数）；null=非 API / 依赖有空。
  const requests = fields.map((f) => buildRequest(f, values));
  // 请求内容签名：签名变才重跑 effect（values/fields 每渲染都是新引用，不能直接做依赖）。
  const signature = JSON.stringify(
    requests.map((r) => (r ? [r.fieldId, r.key] : null)),
  );

  useEffect(() => {
    for (const req of requests) {
      if (!req) continue;
      if (!isValidUrl(req.url)) {
        if (!warnedRef.current.has(req.fieldId)) {
          warnedRef.current.add(req.fieldId);
          toast.error(`远程选项地址非法：${req.url}`);
        }
        continue;
      }
      latestKeyRef.current.set(req.fieldId, req.key);
      // 同 key 已成功 / 正在拉：不重复发。
      if (fetchedRef.current.get(req.fieldId)?.key === req.key) continue;
      if (inflightRef.current.get(req.fieldId) === req.key) continue;
      inflightRef.current.set(req.fieldId, req.key);
      // setState 放 .then 回调里（react-hooks/set-state-in-effect 仅允许异步回调中 setState）。
      Promise.resolve().then(() => {
        setLoadingSet((prev) => {
          if (prev.has(req.fieldId)) return prev;
          const next = new Set(prev);
          next.add(req.fieldId);
          return next;
        });
      });
      const p =
        req.method === "POST"
          ? api.post<unknown>(req.url, { body: req.params })
          : api.get<unknown>(req.url, toQuery(req.params));
      p.then((res) => {
          // 竞态守卫：该字段已发起更新的请求 -> 丢弃旧响应。
          if (latestKeyRef.current.get(req.fieldId) !== req.key) return;
          // mapOptions 内部处理 listPath（响应整体/数组本身均可）。
          const options = mapOptions(res.data, req.mapping);
          fetchedRef.current.set(req.fieldId, { key: req.key, options });
          setFetched(new Map(fetchedRef.current));
        })
        .catch(() => {
          if (latestKeyRef.current.get(req.fieldId) !== req.key) return;
          // 失败不存结果：optionsOf 返回 undefined，调用方回退手动 options。
          toast.error("远程选项加载失败");
        })
        .finally(() => {
          if (inflightRef.current.get(req.fieldId) !== req.key) return;
          inflightRef.current.delete(req.fieldId);
          setLoadingSet((prev) => {
            if (!prev.has(req.fieldId)) return prev;
            const next = new Set(prev);
            next.delete(req.fieldId);
            return next;
          });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // fieldId -> 当前请求 key（依赖有空/非 API 的字段不在其中）。
  const keyByFieldId = new Map<string, string>();
  for (const r of requests) if (r) keyByFieldId.set(r.fieldId, r.key);

  // 值优先级：仅当存在「当前 key」对应的成功结果（含空数组）时返回远程 options；
  // 未加载/失败/依赖为空/结果过期 -> undefined（调用方回退 f.options）。
  function optionsOf(f: DynamicFormField): DynamicFormOption[] | undefined {
    const key = keyByFieldId.get(f.fieldId);
    if (!key) return undefined;
    const entry = fetched.get(f.fieldId);
    return entry && entry.key === key ? entry.options : undefined;
  }

  function loading(fieldId: string): boolean {
    return loadingSet.has(fieldId);
  }

  return { optionsOf, loading };
}

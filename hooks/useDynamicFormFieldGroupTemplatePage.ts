"use client";

import { useEffect, useState } from "react";
import { queryDynamicFormFieldGroupTemplatePage } from "@/lib/api/dynamicFormFieldGroupTemplate";
import type { DynamicFormFieldGroupTemplate, Page } from "@/types";

// 分页查询字段组合模板列表。任一参数或 refreshKey 变化时重拉（增删改后由页面 setRefreshKey 触发）。
export function useDynamicFormFieldGroupTemplatePage(params: {
    search: string;
    current: number;
    size: number;
    refreshKey: number;
}) {
    const { search, current, size, refreshKey } = params;
    const [page, setPage] = useState<Page<DynamicFormFieldGroupTemplate> | null>(null);
    const [loading, setLoading] = useState(true);

    // 参数变化时回到加载态（render 期内条件 setState；effect 内只在异步回调 setState）。
    const depKey = `${search}|${current}|${size}|${refreshKey}`;
    const [prevKey, setPrevKey] = useState(depKey);
    if (prevKey !== depKey) {
        setPrevKey(depKey);
        setLoading(true);
    }

    useEffect(() => {
        let cancelled = false;
        queryDynamicFormFieldGroupTemplatePage({ search: search || undefined, current, size })
            .then((p) => {
                if (!cancelled) setPage(p);
            })
            .catch(() => {
                if (!cancelled) setPage(null);
                })
            .finally(() => {
            if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [search, current, size, refreshKey]);

    return { page, loading };
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    addAiProvider,
    getAiProviderInfo,
    updateAiProvider,
} from "@/lib/api/aiProvider";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiProvider } from "@/types";

const EMPTY: AiProvider = {
    id: 0,
    name: "",
    baseUrl: "",
};

// 返回后回填 description+prompt。两字段均必填。
export function AiProviderFormDialog({
                                         open,
                                         onOpenChange,
                                         editing,
                                         onSuccess,
                                     }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: AiProvider | null;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<AiProvider>(EMPTY);
    const [busy, setBusy] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    // 详情加载失败标记：失败时不展示空表单（防覆盖已有提示词），给重试入口。
    const [infoError, setInfoError] = useState(false);
    // 重试计数：+1 触发 effect 重新拉详情。
    const [reloadKey, setReloadKey] = useState(0);

    const editingId = editing?.id ?? null;
    const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
        open: false,
        id: null,
    });
    if (prev.open !== open || prev.id !== editingId) {
        setPrev({ open, id: editingId });
        if (open) {
            // 编辑：先 loading（清旧值防闪现），effect 异步拉详情回填；新增：直接空表单。
            setDetailLoading(!!editing);
            setInfoError(false);
            setForm(EMPTY);
        }
    }

    useEffect(() => {
        if (!open || editingId == null) return;
        let cancelled = false;
        getAiProviderInfo({ id: editingId })
            .then((d) => {
                if (cancelled) return;
                setForm(d);
            })
            .catch((err) => {
                if (!cancelled) {
                    toast.error(err instanceof ApiError ? err.message : "加载详情失败");
                    setInfoError(true);
                }
            })
            .finally(() => {
                if (!cancelled) setDetailLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [open, editingId, reloadKey]);

    function set<K extends keyof AiProvider>(
        key: K,
        value: AiProvider[K],
    ) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function submit() {

        setBusy(true);
        try {
            if (editing) {
                await updateAiProvider(form);
                toast.success("已保存");
            } else {
                await addAiProvider({ name: form.name, baseUrl: form.baseUrl });
                toast.success("已新增");
            }
            onOpenChange(false);
            onSuccess();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "操作失败");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editing ? "编辑" : "新增"}</DialogTitle>
                    <DialogDescription>
                        {editing ? "修改此数据" : "新建一条数据"}
                    </DialogDescription>
                </DialogHeader>

                {detailLoading ? (
                    <div className="flex flex-col gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-9 w-full" />
                        ))}
                    </div>
                ) : infoError ? (
                    // 详情加载失败：不展示空表单，避免保存时覆盖已有提示词。
                    <div className="flex flex-col items-center gap-3 py-6">
                        <p className="text-sm text-muted-foreground">加载提示词详情失败</p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setInfoError(false);
                                setDetailLoading(true);
                                setReloadKey((k) => k + 1);
                            }}
                        >
                            重试
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {editing && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm text-muted-foreground">id</Label>
                                <Input
                                    value={form.id}
                                    type="number"
                                    disabled
                                />
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm text-muted-foreground">name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                type={"text"}
                                placeholder="供应商名称"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm text-muted-foreground">baseUrl</Label>
                            <Input
                                value={form.baseUrl}
                                onChange={(e) => set("baseUrl", e.target.value)}
                                type={"text"}
                                placeholder="供应商baseurl"
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={busy || detailLoading || infoError}
                    >
                        {busy ? "保存中…" : "保存"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

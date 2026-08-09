"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addAiModel, getAiModelInfo, updateAiModel } from "@/lib/api/aiModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { AiModel, AiModelPayload, AiModelType } from "@/types";
import { AI_MODEL_TYPE_LABELS } from "@/types";

type FormState = AiModelPayload;

const EMPTY: FormState = {
  name: "",
  model: "",
  type: "CHAT",
  baseUrl: "",
  completionsPath: "",
  embeddingsPath: "",
  apiKey: "",
  description: "",
};

const MODEL_TYPES = Object.entries(AI_MODEL_TYPE_LABELS) as [
  AiModelType,
  string,
][];

// 新增 / 编辑模型。editing 非 null 时为编辑：开弹窗即 loading，/ai/model/info 返回后回填全量。
// name/model 必填；baseUrl/completionsPath/embeddingsPath/apiKey/description 可空。
export function AiModelFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModel | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  // 详情加载失败标记：失败时不展示空表单（防覆盖连接配置），给重试入口。
  const [infoError, setInfoError] = useState(false);
  // 重试计数：+1 触发 effect 重新拉详情。
  const [reloadKey, setReloadKey] = useState(0);
  // 编辑时详情返回的原始 apiKey：提交时比对，仅当被修改才传 apiKey（未改不带该字段）。
  const [originalApiKey, setOriginalApiKey] = useState("");

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      if (editing) {
        // 编辑：先 loading（清旧值防闪现），effect 异步拉详情回填。
        setDetailLoading(true);
        setInfoError(false);
        setForm(EMPTY);
        setOriginalApiKey("");
      } else {
        setDetailLoading(false);
        setInfoError(false);
        setForm(EMPTY);
        setOriginalApiKey("");
      }
    }
  }

  useEffect(() => {
    if (!open || !editingId) return;
    let cancelled = false;
    getAiModelInfo(editingId)
      .then((d) => {
        if (cancelled) return;
        const apiKey = d.apiKey ?? "";
        setOriginalApiKey(apiKey);
        setForm({
          name: d.name,
          model: d.model,
          type: d.type ?? "CHAT",
          baseUrl: d.baseUrl ?? "",
          completionsPath: d.completionsPath ?? "",
          embeddingsPath: d.embeddingsPath ?? "",
          apiKey,
          description: d.description ?? "",
        });
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("请输入名称");
      return;
    }
    if (!form.model.trim()) {
      toast.error("请输入模型");
      return;
    }
    setBusy(true);
    try {
      const payload: AiModelPayload = {
        name: form.name.trim(),
        model: form.model.trim(),
        type: form.type,
        baseUrl: form.baseUrl.trim(),
        completionsPath: form.completionsPath.trim(),
        embeddingsPath: form.embeddingsPath.trim(),
        apiKey: form.apiKey.trim(),
        description: form.description,
      };
      if (editing) {
        const trimmedKey = form.apiKey.trim();
        // apiKey 仅当被修改才传；未改（与详情原值一致）则不带该字段（故不并入下方 body）。
        await updateAiModel({
          id: editing.id,
          name: payload.name,
          model: payload.model,
          type: payload.type,
          baseUrl: payload.baseUrl,
          completionsPath: payload.completionsPath,
          embeddingsPath: payload.embeddingsPath,
          description: payload.description,
          ...(trimmedKey !== originalApiKey ? { apiKey: trimmedKey } : {}),
        });
        toast.success("已保存");
      } else {
        await addAiModel(payload);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模型" : "新增模型"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改模型配置。" : "新建一个 AI 模型。"}
          </DialogDescription>
        </DialogHeader>

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : infoError ? (
          // 详情加载失败：不展示空表单，避免保存时覆盖已存连接配置。
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载模型详情失败</p>
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
            <div className="grid grid-cols-[96px_1fr] items-center gap-x-4 gap-y-3">
              <Label className="text-sm text-muted-foreground">名称 *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="如 GPT-4o"
              />
              <Label className="text-sm text-muted-foreground">模型 *</Label>
              <Input
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="如 gpt-4o"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">类型 *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => set("type", v as AiModelType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {MODEL_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-sm text-muted-foreground">基础URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://api.example.com"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">
                completions
              </Label>
              <Input
                value={form.completionsPath}
                onChange={(e) => set("completionsPath", e.target.value)}
                placeholder="/v1/chat/completions"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">
                embeddings
              </Label>
              <Input
                value={form.embeddingsPath}
                onChange={(e) => set("embeddingsPath", e.target.value)}
                placeholder="/v1/embeddings"
                className="font-mono text-sm"
              />
              <Label className="text-sm text-muted-foreground">API密钥</Label>
              <Input
                value={form.apiKey}
                onChange={(e) => set("apiKey", e.target.value)}
                placeholder="sk-..."
                className="font-mono text-sm"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="一句话描述（可选）"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy || detailLoading || infoError}>
            {busy ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

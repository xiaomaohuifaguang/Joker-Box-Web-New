"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addAiChannel,
  getAiChannelInfo,
  getAiChannelModels,
  testAiChannel,
  updateAiChannel,
} from "@/lib/api/aiChannel";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import type { AiChannel, AiChannelInput, AiChannelModel } from "@/types";
import { AiProviderSelect } from "./AiProviderSelect";
import { TableEmptyRow } from "@/components/TableEmptyRow";

const EMPTY: AiChannel = {
  id: 0,
  name: "",
  providerId: undefined,
  baseUrl: "",
  apiKey: "",
  models: [],
};

export function AiChannelFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiChannel | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<AiChannel>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [missingModelIndexes, setMissingModelIndexes] = useState<number[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [infoError, setInfoError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const editingId = editing?.id ?? null;
  const [prev, setPrev] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  });
  if (prev.open !== open || prev.id !== editingId) {
    setPrev({ open, id: editingId });
    if (open) {
      // 编辑先清旧值并加载详情；新增直接进入自定义渠道空表单。
      setDetailLoading(editing !== null);
      setInfoError(false);
      setForm(EMPTY);
      setMissingModelIndexes([]);
    }
  }

  useEffect(() => {
    if (!open || editingId == null) return;
    let cancelled = false;
    getAiChannelInfo({ id: editingId })
      .then((data) => {
        if (!cancelled) {
          setForm({
            ...data,
            models: (data.models ?? []).map((item) => ({
              ...item,
              vision: item.vision ?? false,
            })),
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof ApiError ? error.message : "加载详情失败");
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

  const isCustom = form.providerId == null;
  const models = form.models ?? [];

  function set<K extends keyof AiChannel>(key: K, value: AiChannel[K]) {
    const connectionChanged = key === "apiKey" || key === "baseUrl";
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(connectionChanged ? { models: [] } : {}),
    }));
    if (connectionChanged) setMissingModelIndexes([]);
  }

  function addModel() {
    setForm((current) => ({
      ...current,
      models: [...(current.models ?? []), { name: "", model: "", vision: false }],
    }));
  }

  function updateModel<K extends keyof AiChannelModel>(
    index: number,
    key: K,
    value: AiChannelModel[K],
  ) {
    setForm((current) => ({
      ...current,
      models: (current.models ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function removeModel(index: number) {
    setForm((current) => ({
      ...current,
      models: (current.models ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
    setMissingModelIndexes((current) =>
      current
        .filter((itemIndex) => itemIndex !== index)
        .map((itemIndex) => itemIndex > index ? itemIndex - 1 : itemIndex),
    );
  }

  async function testConnection() {
    const baseUrl = form.baseUrl?.trim();
    if (isCustom && !baseUrl) {
      toast.error("自定义渠道需填写 BaseUrl");
      return;
    }

    setTesting(true);
    try {
      const passed = await testAiChannel({
        apiKey: form.apiKey,
        providerId: isCustom ? undefined : form.providerId,
        baseUrl: isCustom ? baseUrl : undefined,
      });
      if (passed) {
        toast.success("测试通过");
      } else {
        toast.error("测试未通过");
      }
    } catch {
      // 测试接口不展示后端错误详情，只反馈是否通过。
      toast.error("测试未通过");
    } finally {
      setTesting(false);
    }
  }

  async function fetchModels() {
    const baseUrl = form.baseUrl?.trim();
    if (isCustom && !baseUrl) {
      toast.error("自定义渠道需填写 BaseUrl");
      return;
    }

    setModelsLoading(true);
    try {
      const list = await getAiChannelModels({
        apiKey: form.apiKey,
        providerId: isCustom ? undefined : form.providerId,
        baseUrl: isCustom ? baseUrl : undefined,
      });
      const responseModels = Array.from(
        new Map(
          list
            .filter((item) => item.model)
            .map((item) => [item.model, { ...item, vision: item.vision ?? false }]),
        ).values(),
      );
      const responseKeys = new Set(responseModels.map((item) => item.model));
      const responseByModel = new Map(responseModels.map((item) => [item.model, item]));
      const existingKeys = new Set(models.map((item) => item.model));
      const additions = responseModels.filter((item) => !existingKeys.has(item.model));

      // 已有模型保留名称和顺序；仍在响应中的项以最新 vision 覆盖，其余保持不变。
      setForm((current) => ({
        ...current,
        models: [
          ...(current.models ?? []).map((item) => {
            const latest = responseByModel.get(item.model);
            return latest ? { ...item, vision: latest.vision ?? false } : item;
          }),
          ...additions,
        ],
      }));
      // 只标记更新前已存在、但本次响应缺失的模型；下次更新会重新计算。
      setMissingModelIndexes(
        models.flatMap((item, index) => responseKeys.has(item.model) ? [] : [index]),
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "获取模型失败");
    } finally {
      setModelsLoading(false);
    }
  }

  async function submit() {
    const baseUrl = form.baseUrl?.trim();
    if (isCustom && !baseUrl) {
      toast.error("自定义渠道需填写 BaseUrl");
      return;
    }

    // 详情只读字段不回传；已有供应商使用其 BaseUrl，不传自定义 baseUrl。
    const payload: AiChannelInput = {
      name: form.name,
      providerId: isCustom ? undefined : form.providerId,
      baseUrl: isCustom ? baseUrl : undefined,
      apiKey: form.apiKey,
      models,
    };

    setBusy(true);
    try {
      if (editing) {
        await updateAiChannel({ id: editing.id, ...payload });
        toast.success("已保存");
      } else {
        await addAiChannel(payload);
        toast.success("已新增");
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <DialogTitle className="font-display text-xl">
            {editing ? "编辑渠道" : "新增渠道"}
          </DialogTitle>
          <DialogDescription>
            配置连接凭证，并维护该渠道可调用的模型。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">

        {detailLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : infoError ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">加载渠道详情失败</p>
            <Button
              variant="outline"
              onClick={() => {
                setInfoError(false);
                setDetailLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              重试
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <section aria-labelledby="channel-connection-heading">
              <div className="mb-4 flex items-center gap-2">
                <span aria-hidden="true" className="h-4 w-0.5 rounded-full bg-brand" />
                <h3 id="channel-connection-heading" className="text-sm font-medium">
                  连接配置
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
            {editing && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground">渠道 ID</Label>
                <Input value={form.id} type="number" disabled />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground">渠道名称</Label>
              <Input
                value={form.name ?? ""}
                onChange={(event) => set("name", event.target.value)}
                placeholder="渠道名称"
              />
            </div>
            <div className={editing ? "flex flex-col gap-2 sm:col-span-2" : "flex flex-col gap-2"}>
              <Label className="text-xs font-medium text-muted-foreground">供应商</Label>
              <AiProviderSelect
                value={form.providerId}
                selectedName={form.providerName}
                disabled={busy || testing || modelsLoading}
                onChange={(id, name) => {
                  setMissingModelIndexes([]);
                  setForm((current) => ({
                    ...current,
                    providerId: id,
                    providerName: name,
                    baseUrl: id == null ? current.baseUrl : "",
                    models: [],
                  }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                不选择供应商即为自定义渠道
              </p>
            </div>
            {isCustom && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  自定义 BaseUrl <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.baseUrl ?? ""}
                  onChange={(event) => set("baseUrl", event.target.value)}
                  placeholder="请输入自定义渠道 BaseUrl"
                  disabled={modelsLoading}
                />
              </div>
            )}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">API KEY</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.apiKey ?? ""}
                  onChange={(event) => set("apiKey", event.target.value)}
                  placeholder="API KEY"
                  disabled={modelsLoading}
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={testConnection}
                  disabled={busy || testing || modelsLoading}
                >
                  {testing ? "测试中…" : "测试"}
                </Button>
              </div>
            </div>
              </div>
            </section>

            <section aria-labelledby="channel-models-heading">
            <div className="overflow-hidden rounded-md border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <h3 id="channel-models-heading" className="text-sm font-medium">模型清单</h3>
                  <span className="text-xs text-muted-foreground">{models.length} 个模型</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addModel}
                    disabled={busy || modelsLoading}
                  >
                    <Plus className="h-4 w-4" />
                    手动新增
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchModels}
                    disabled={busy || testing || modelsLoading}
                  >
                    {modelsLoading
                      ? models.length === 0 ? "增加中…" : "更新中…"
                      : models.length === 0 ? "增加模型" : "更新模型"}
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-2">name</TableHead>
                      <TableHead className="h-9 px-2">model</TableHead>
                      <TableHead className="h-9 w-16 px-2 text-center">vision</TableHead>
                      <TableHead className="h-9 w-20 px-2 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelsLoading ? (
                      Array.from({ length: 2 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={4} className="p-2">
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : models.length ? (
                      models.map((item, index) => {
                        const missing = missingModelIndexes.includes(index);
                        return (
                          <TableRow
                            key={index}
                            className={missing ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}
                          >
                            <TableCell className="min-w-44 p-2 align-top">
                              <Input
                                value={item.name}
                                onChange={(event) => updateModel(index, "name", event.target.value)}
                                aria-label={`第 ${index + 1} 行模型名称`}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="min-w-52 p-2 align-top">
                              <Input
                                value={item.model}
                                onChange={(event) => updateModel(index, "model", event.target.value)}
                                aria-label={`第 ${index + 1} 行模型标识`}
                                className="h-8 font-mono text-xs"
                              />
                            </TableCell>
                            <TableCell className="w-16 p-2 text-center align-top">
                              <Switch
                                checked={item.vision ?? false}
                                onCheckedChange={(checked) => updateModel(index, "vision", checked)}
                                aria-label={`第 ${index + 1} 行图形理解能力`}
                                className="mt-2"
                              />
                            </TableCell>
                            <TableCell className="p-2 text-right align-top">
                              <div className="flex items-center justify-end gap-1">
                                {missing && (
                                  <span
                                    role="img"
                                    aria-label="不在提供方模型列表中"
                                    title="不在提供方模型列表中"
                                    className="inline-flex h-8 w-8 items-center justify-center text-amber-600 dark:text-amber-400"
                                  >
                                    <CircleAlert className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeModel(index)}
                                  aria-label={`删除第 ${index + 1} 行模型`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableEmptyRow colSpan={4} title="从提供方增加模型，或手动新增一行" />
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            </section>
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-surface px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={busy || testing || modelsLoading || detailLoading || infoError}
          >
            {busy ? "保存中…" : "保存渠道"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

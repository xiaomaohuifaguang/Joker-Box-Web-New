"use client";

import { useEffect, useState } from "react";
import { Route, Workflow } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getProcessDefinitionInfo } from "@/lib/api/process";
import { useIsDark } from "@/hooks/useIsDark";
import type { ProcessDefinition, ProcessTrack } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { edgeColors } from "./flow-utils";
import { ProcessFlowCanvas } from "./ProcessFlowCanvas";

// 「流程预览 / 流程追踪」入口：按钮组 + 弹窗一体（各实例视图接入零状态管理）。
// - 流程预览：纯图（无追踪叠加），definitionId 存在即常驻。
// - 流程追踪：传了 track（ProcessInstance.processTrack）才出现；弹窗带图例 + 画布追踪高亮。
// 两个按钮共享一次 info 请求（按 definitionId|version 缓存，重复打开不重拉）；
// version 传实例自身的 processDefinitionVersion，图与实例版本一致。
// definitionId 为空（详情未加载完）时整体不渲染。
export function ProcessFlowButtons({
  definitionId,
  version,
  track,
  className,
}: {
  /** 流程定义 id（空则不渲染） */
  definitionId?: number;
  /** 定义版本（String，可空=最新；实例页传 processDefinitionVersion） */
  version?: string;
  /** 流程追踪信息（有则追加「流程追踪」按钮） */
  track?: ProcessTrack;
  className?: string;
}) {
  // 弹窗打开来源：null=关闭；preview=纯预览；track=追踪（图例+高亮）。
  const [mode, setMode] = useState<"preview" | "track" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ProcessDefinition | null>(null);
  // 已成功加载的 definitionId|version（重复打开命中缓存，不闪 skeleton）
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reqKey = definitionId != null ? `${definitionId}|${version ?? ""}` : null;
  const isDark = useIsDark();
  const colors = edgeColors(isDark);

  // 打开且未缓存才拉取。setState 只在异步回调里（react-hooks/set-state-in-effect）；
  // loading/error 的复位在打开/重试的事件回调里做。
  useEffect(() => {
    if (mode == null || definitionId == null || reqKey == null || loadedFor === reqKey) return;
    let cancelled = false;
    getProcessDefinitionInfo(definitionId, version)
      .then((d) => {
        if (cancelled) return;
        setInfo(d);
        setLoadedFor(reqKey);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : "流程图加载失败");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, definitionId, version, reqKey, loadedFor, reloadKey]);

  if (definitionId == null) return null;

  const openWith = (m: "preview" | "track") => {
    setMode(m);
    if (loadedFor !== reqKey) {
      setLoading(true);
      setError(null);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const hasGraph = (info?.rawData?.nodes?.length ?? 0) > 0;
  const isTrack = mode === "track";

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => openWith("preview")}>
          <Workflow className="h-4 w-4" />
          流程预览
        </Button>
        {track && (
          <Button variant="outline" size="sm" onClick={() => openWith("track")}>
            <Route className="h-4 w-4" />
            流程追踪
          </Button>
        )}
      </div>
      <Dialog open={mode != null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {isTrack ? "流程追踪" : "流程预览"}
              {info?.processName ? ` · ${info.processName}` : ""}
              {info?.version ? ` · v${info.version}` : ""}
            </DialogTitle>
          </DialogHeader>
          {isTrack && track && (
            // 图例：色点用具体色值（与画布 hex 同源，SVG/信号色不走 token），当前任务点带脉冲。
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: colors.done }}
                />
                已走过
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: colors.active }}
                />
                活动节点
              </span>
              {track.currentNodeId && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="flow-node-current inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: colors.active }}
                  />
                  当前任务
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border"
                  style={{ borderColor: colors.base }}
                />
                未经过
              </span>
            </div>
          )}
          {loading ? (
            <Skeleton className="h-[70vh] w-full" />
          ) : error ? (
            <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                重试
              </Button>
            </div>
          ) : !hasGraph ? (
            <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
              暂无流程图数据
            </div>
          ) : (
            // key=reqKey：切换定义/版本时整体重挂载，fitView 重新适配
            <ProcessFlowCanvas
              key={reqKey}
              rawData={info?.rawData}
              track={isTrack ? track : undefined}
              className="h-[70vh] w-full overflow-hidden rounded-md border"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

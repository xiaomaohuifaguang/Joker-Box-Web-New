"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
} from "@xyflow/react";
// 前台路由不经过设计器，库样式要自己带（与设计器里的同名 import 由打包器去重）。
import "@xyflow/react/dist/style.css";
import { useIsDark } from "@/hooks/useIsDark";
import type { ProcessRawData, ProcessTrack } from "@/types";
import {
  PROCESS_NODE_REGISTRY,
  processNodeTypes,
  type ProcessFlowNode,
  type ProcessNodeData,
  type ProcessNodeKind,
} from "./nodes";
import {
  DEFAULT_EDGE_OPTIONS,
  edgeColors,
  edgesFromRaw,
  nodesFromRaw,
} from "./flow-utils";

// 节点初始尺寸提示（与 nodes.tsx 固定 CSS 尺寸一致）。rawData 不存尺寸；MiniMap 渲染节点要求
// userNode 有 measured/width/initialWidth（nodeHasDimensions），而只读画布是受控 nodes 且无
// onNodesChange——dimensions change 永远写不回 userNode，不补初始尺寸 MiniMap 会整版空白。
// initialWidth/Height 只是实测前提示：实测后 measured 覆盖，不进 DOM style、不入库。
function initialSizeFor(n: ProcessFlowNode): { initialWidth: number; initialHeight: number } {
  if (n.type === "endEvent") return { initialWidth: 44, initialHeight: 44 }; // 结束双圈 h-11 w-11
  const shape = PROCESS_NODE_REGISTRY[(n.type as ProcessNodeKind) ?? "serviceTask"].shape;
  if (shape === "task") return { initialWidth: 128, initialHeight: 32 }; // h-8 w-32
  if (shape === "gateway") return { initialWidth: 44, initialHeight: 44 }; // h-11 w-11
  return { initialWidth: 40, initialHeight: 40 }; // 开始 h-10 w-10
}

// 流程图只读画布（前台流程预览/流程追踪用）。rawData 持久化了节点 position，直接 fitView 还原，不做 dagre 重排。
// 边色用具体色值而非 CSS 变量（SVG 解析不到 :root，见 flow-utils 注释）；明/暗跟随 useIsDark。
// **父容器必须显式定高**（ReactFlow 撑满父级，父级不定高则画布塌成 0）。
//
// 追踪视觉（track 存在时；无 track = 纯预览）：
//   绿=已走过（doneNodeIds 节点绿环 / passedEdgeIds 连线绿色加粗，走过的默认分支保持虚线变绿）
//   蓝=当前（activeNodeIds 蓝 glow；currentNodeId 蓝 glow + 脉冲，仅处理页返回）
//   灰=未经过（默认）。优先级 current > active > done，同节点只取最高档注入。
export function ProcessFlowCanvas({
  rawData,
  track,
  className,
}: {
  /** 流程定义画布数据（ProcessDefinition.rawData） */
  rawData?: ProcessRawData;
  /** 流程追踪信息（ProcessInstance.processTrack）；不传=纯预览 */
  track?: ProcessTrack;
  /** 外层容器类名（必须含确定高度，如 h-[70vh]） */
  className?: string;
}) {
  const isDark = useIsDark();
  // memo 稳定引用：edgeColors 每次返回新对象，不 memo 会让 edges memo 每次渲染都失效。
  const colors = useMemo(() => edgeColors(isDark), [isDark]);

  // 节点：rawData 还原 + 初始尺寸提示 + 追踪高亮注入（__ 前缀运行时字段，不入库——同设计器 simNodes 的 __active 做法）。
  const nodes = useMemo(() => {
    const list = nodesFromRaw(rawData);
    const done = new Set(track?.doneNodeIds ?? []);
    const active = new Set(track?.activeNodeIds ?? []);
    const current = track?.currentNodeId;
    return list.map((n) => {
      const sized = { ...n, ...initialSizeFor(n) };
      if (current === n.id)
        return { ...sized, data: { ...n.data, __active: true, __current: true } };
      if (active.has(n.id)) return { ...sized, data: { ...n.data, __active: true } };
      if (done.has(n.id)) return { ...sized, data: { ...n.data, __done: true } };
      return sized;
    });
  }, [rawData, track]);

  // 边：edgesFromRaw 补回渲染细节后统一上显示色。追踪优先：走过的连线绿色加粗（默认分支保留虚线变绿）；
  // 未走过的——默认分支（排他网关兜底）紫虚线 + 「默认」标，其余常态中性石墨。
  const edges = useMemo(() => {
    const passed = new Set(track?.passedEdgeIds ?? []);
    return edgesFromRaw(rawData, nodes).map((e) => {
      if (passed.has(e.id)) {
        const isDefault = e.data?.isDefault === true;
        return {
          ...e,
          label: e.label ?? (isDefault ? "默认" : undefined),
          labelStyle: { fill: colors.done, fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: "transparent" },
          style: {
            stroke: colors.done,
            strokeWidth: 2,
            ...(isDefault ? { strokeDasharray: "7 4" } : {}),
          },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: colors.done },
        };
      }
      if (e.data?.isDefault === true) {
        return {
          ...e,
          label: e.label ?? "默认",
          labelStyle: { fill: colors.default, fontWeight: 600, fontSize: 11 },
          labelBgStyle: { fill: "transparent" },
          style: { stroke: colors.default, strokeWidth: 2, strokeDasharray: "7 4" },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: colors.default },
        };
      }
      return {
        ...e,
        style: { stroke: colors.base, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: colors.base },
      };
    });
  }, [rawData, nodes, track, colors]);

  return (
    <div className={className}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={processNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        {/* 点阵（24px 细点）+ 主网格线（120px），同设计器；Background 的 color 是 SVG pattern，
            解析不到 :root 变量，故用具体色值 + useIsDark 切明/暗两档。 */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? "#3d434c" : "#c6ccd4"}
        />
        <Background
          variant={BackgroundVariant.Lines}
          gap={120}
          size={1}
          color={isDark ? "#3a4048" : "#d3d8df"}
          style={{ opacity: 0.6 }}
        />
        <Controls position="bottom-left" />
        {/* MiniMap 节点色跟随追踪状态（current/active=蓝，done=绿，未走=石墨），缩略图也带信息。 */}
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const d = n.data as ProcessNodeData;
            if (d.__current || d.__active) return colors.active;
            if (d.__done) return colors.done;
            return colors.base;
          }}
          className="!bg-background"
        />
      </ReactFlow>
    </div>
  );
}

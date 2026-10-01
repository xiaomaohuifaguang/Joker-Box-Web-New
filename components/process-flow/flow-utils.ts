import type { Edge } from "@xyflow/react";
import {
  PROCESS_NODE_REGISTRY,
  type ProcessFlowNode,
  type ProcessNodeKind,
} from "./nodes";

// rawData（保存的结构）↔ React Flow nodes/edges 的纯函数转换 + 画布视觉常量。
// 设计器（编辑/查看）与前台流程预览（ProcessFlowCanvas）共用；这里只放无编辑器依赖的纯函数，
// 保存路径（stripNode/stripEdge/buildRawData）仍在 ProcessDesigner.tsx。

// ===== 画布「接线图」视觉系统 =====
// 刻意不跟随各主题品牌色：画布是工程工具不是品牌页，选中/带电信号要在所有预设+明暗下恒定可预期。
//   EDGE_ACTIVE 选中 + 拖动插入 + 模拟运行带电：工程蓝（接线图「通电」信号），dark 下用更亮的蓝保证可读。
//   EDGE_BASE   连线常态：中性石墨，light/dark 两档（JS 写的 stroke 无法像 CSS 自动跟 scheme）。
// 具体色值而非 CSS 变量——SVG path/marker 的渲染上下文解析不到 :root 上的 var(--x)，会致线不渲染。
export const EDGE_BASE_LIGHT = "#9aa3ae";
export const EDGE_BASE_DARK = "#6b7280";
export const EDGE_ACTIVE_LIGHT = "#2563eb";
export const EDGE_ACTIVE_DARK = "#60a5fa";
// 默认分支（排他网关唯一兜底出线）专用紫，与常态灰/选中蓝明显区分。
export const EDGE_DEFAULT_LIGHT = "#9333ea";
export const EDGE_DEFAULT_DARK = "#c084fc";
// 流程追踪·已走过路径专用绿（历史轨迹），与当前蓝/常态灰区分；同样恒定不随预设。
export const TRACK_DONE_LIGHT = "#16a34a";
export const TRACK_DONE_DARK = "#4ade80";

// 按明/暗取一套边色（配合 hooks/useIsDark）。done=流程追踪已走过连线色（画布/图例共用）。
export function edgeColors(isDark: boolean) {
  return {
    base: isDark ? EDGE_BASE_DARK : EDGE_BASE_LIGHT,
    active: isDark ? EDGE_ACTIVE_DARK : EDGE_ACTIVE_LIGHT,
    default: isDark ? EDGE_DEFAULT_DARK : EDGE_DEFAULT_LIGHT,
    done: isDark ? TRACK_DONE_DARK : TRACK_DONE_LIGHT,
  };
}

export const DEFAULT_EDGE_OPTIONS = { interactionWidth: 24 };

export function createEdge(source: string, target: string, base?: Partial<Edge>): Edge {
  return {
    // edge id 须符合 NCName（BPMN id 是 xsd:ID）：字母/下划线开头，不含 > 等标记字符。
    // 故用 e_source_target（_ 连接），不用「source->target」（> 非法）。
    id: `e_${source}_${target}`,
    source,
    target,
    // 正交折线（横竖分明，交叉处比贝塞尔可辨），小圆角过渡；type/pathOptions 是渲染细节，
    // 保存时 stripEdge 会剥掉、加载时由这里统一补，不进 rawData。
    // pathOptions 不在基础 Edge 类型上（仅 BuiltInEdge 各变体有），故用断言补上。
    type: "smoothstep",
    ...base,
    pathOptions: { borderRadius: 8 },
  } as Edge;
}

// ===== 网关出边锚点自动分配 =====
// 网关有 右(默认,无 id)/上(out-top)/下(out-bottom) 三个出锚点，按目标节点中心方位选：
// |中心 dy| 超过阈值才改走上/下，否则保持右侧默认。目的：多条分支不再挤在右角同点出发重合。
// 仅网关多出锚点（任务/开始 maxOut=1 无扇出问题）；sourceHandle 随 stripEdge 入 rawData、加载时还原。
// 注意：只影响连线「从哪个点出发」，出入边数量约束（checkLink 的 maxIn/maxOut）按节点计边数，不受影响。
export const GATEWAY_FAN_THRESHOLD = 48;

export function nodeCenterY(n: ProcessFlowNode): number {
  // measured 是 React Flow 实测高；未测（刚加载/未渲染完）按形状族兜底（事件40/任务32/网关44）。
  const shape = PROCESS_NODE_REGISTRY[(n.type as ProcessNodeKind) ?? "serviceTask"].shape;
  const fallback = shape === "gateway" ? 44 : shape === "event" ? 40 : 32;
  return n.position.y + (n.measured?.height ?? fallback) / 2;
}

// 节点外框尺寸（dagre 布局用）：优先实测，否则按形状族兜底（与 nodes.tsx 固定尺寸一致）。
export function nodeSizeFor(n: ProcessFlowNode): { w: number; h: number } {
  const shape = PROCESS_NODE_REGISTRY[(n.type as ProcessNodeKind) ?? "serviceTask"].shape;
  const fallback = shape === "task" ? { w: 128, h: 32 } : { w: 44, h: 44 };
  return { w: n.measured?.width ?? fallback.w, h: n.measured?.height ?? fallback.h };
}

// 返回 undefined=默认右锚点（不写 sourceHandle，兼容旧数据）。非网关源恒 undefined（没有上下锚点）。
export function pickGatewaySourceHandle(source: ProcessFlowNode, target: ProcessFlowNode): string | undefined {
  if (PROCESS_NODE_REGISTRY[(source.type as ProcessNodeKind) ?? "serviceTask"].shape !== "gateway")
    return undefined;
  const dy = nodeCenterY(target) - nodeCenterY(source);
  if (dy < -GATEWAY_FAN_THRESHOLD) return "out-top";
  if (dy > GATEWAY_FAN_THRESHOLD) return "out-bottom";
  return undefined;
}

// rawData（保存的结构）→ React Flow nodes/edges。nodes 直接还原；edges 由 createEdge 补回渲染样式。
// rawData 即 add/save 存的 {nodes, edges}（剥样式/运行时），后端透传存储。
export function nodesFromRaw(raw: unknown): ProcessFlowNode[] {
  const list = (raw as { nodes?: unknown[] } | undefined)?.nodes;
  return Array.isArray(list) ? (list as ProcessFlowNode[]) : [];
}

export function edgesFromRaw(raw: unknown, nodes: ProcessFlowNode[]): Edge[] {
  const list = (raw as { edges?: Array<{ id?: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; label?: unknown; data?: unknown }> } | undefined)?.edges;
  if (!Array.isArray(list)) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return list.map((e) => {
    const data = e.data as Edge["data"];
    // label 双写兼容：原生 label 优先；缺则回退 data.label（旧数据/后端只在 data 里放 label 的情况）。
    const label = e.label ?? (data as { label?: unknown } | undefined)?.label;
    // 扇出锚点还原：优先存量 sourceHandle；旧数据没有则按节点方位补算（仅网关有上/下锚点）。
    const src = byId.get(e.source);
    const tgt = byId.get(e.target);
    const sourceHandle = e.sourceHandle ?? (src && tgt ? pickGatewaySourceHandle(src, tgt) : undefined);
    return createEdge(e.source, e.target, {
      ...(e.id ? { id: e.id } : {}),
      ...(sourceHandle ? { sourceHandle } : {}),
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
      ...(label != null ? { label: label as Edge["label"] } : {}),
      ...(data != null ? { data } : {}),
    });
  });
}

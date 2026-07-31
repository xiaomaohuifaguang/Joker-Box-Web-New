"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type Connection,
  type Edge,
  type NodeChange,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Database, Play, Save, Search, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsDark } from "@/hooks/useIsDark";
import {
  addProcessDefinition,
  getProcessDefinitionInfo,
  saveProcessDefinition,
} from "@/lib/api/process";
import { getPublishedForms } from "@/lib/api/dynamicForm";
import { ApiError } from "@/lib/api";
import type { DynamicFormPublishedVersion, ProcessRawData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { ProcessDataDialog } from "./ProcessDataDialog";
import { ProcessRunPanel } from "./ProcessRunPanel";
import {
  PROCESS_NODE_LIST,
  PROCESS_NODE_REGISTRY,
  hitEdgeIdAt,
  processNodeContextHandler,
  processNodeTypes,
  type ProcessFlowNode,
  type ProcessNodeData,
  type ProcessNodeKind,
  type ProcessEdgeData,
} from "./nodes";
import { UserTaskConfig } from "./UserTaskConfig";
import { ServiceTaskConfig } from "./ServiceTaskConfig";

const initialNodes: ProcessFlowNode[] = [
  { id: "start", type: "startEvent", position: { x: 120, y: 140 }, data: { label: "开始" } },
  { id: "end", type: "endEvent", position: { x: 560, y: 140 }, data: { label: "结束" } },
];
const initialEdges: Edge[] = [];

// ===== 画布「接线图」视觉系统 =====
// 刻意不跟随各主题品牌色：画布是工程工具不是品牌页，选中/带电信号要在所有预设+明暗下恒定可预期。
//   EDGE_ACTIVE 选中 + 拖动插入 + 模拟运行带电：工程蓝（接线图「通电」信号），dark 下用更亮的蓝保证可读。
//   EDGE_BASE   连线常态：中性石墨，light/dark 两档（JS 写的 stroke 无法像 CSS 自动跟 scheme）。
// 具体色值而非 CSS 变量——SVG path/marker 的渲染上下文解析不到 :root 上的 var(--x)，会致线不渲染。
const EDGE_BASE_LIGHT = "#9aa3ae";
const EDGE_BASE_DARK = "#6b7280";
const EDGE_ACTIVE_LIGHT = "#2563eb";
const EDGE_ACTIVE_DARK = "#60a5fa";
// 默认分支（排他网关唯一兜底出线）专用紫，与常态灰/选中蓝明显区分。
const EDGE_DEFAULT_LIGHT = "#9333ea";
const EDGE_DEFAULT_DARK = "#c084fc";

const DEFAULT_EDGE_OPTIONS = { interactionWidth: 24 };

function createEdge(source: string, target: string, base?: Partial<Edge>): Edge {
  return {
    // edge id 须符合 NCName（BPMN id 是 xsd:ID）：字母/下划线开头，不含 > 等标记字符。
    // 故用 e_source_target（_ 连接），不用「source->target」（> 非法）。
    id: `e_${source}_${target}`,
    source,
    target,
    ...base,
  };
}

// 保存前剥离节点运行时字段（__active/__names/selected/dragging/measured 等），只留业务结构。
function stripNode(n: ProcessFlowNode) {
  const { selected, dragging, measured, ...rest } = n as ProcessFlowNode & {
    selected?: boolean;
    dragging?: boolean;
    measured?: unknown;
  };
  void selected;
  void dragging;
  void measured;
  // 剥离 __ 前缀运行时字段（__active 高亮、__names 候选展示名映射——均不入库）。
  const data = Object.fromEntries(
    Object.entries((rest.data ?? {}) as Record<string, unknown>).filter(([k]) => !k.startsWith("__")),
  );
  return { ...rest, data };
}

// 保存前剥离连线：只留语义字段（id/source/target/handle/label/data），剥掉 style/markerEnd/selected。
// 样式是渲染细节（React Flow 特有 + Tailwind token），不该进 rawData——加载回填时由 createEdge 统一补。
// 排他/包容网关出边：按源节点类型归一化，保证必须字段显式入库（不依赖 UI 是否触发过 onChange）——
//   isDefault 必传（默认 false）；conditionType 默认 CUSTOM；NATIVE 时 nativeExpression 默认 ${false}；
//   默认分支或 CUSTOM 时 nativeExpression 置空。
function stripEdge(e: Edge, sourceKind?: string) {
  const isConditionalGateway = sourceKind === "exclusiveGateway" || sourceKind === "inclusiveGateway";
  let data = e.data;
  if (isConditionalGateway) {
    const d = (e.data ?? {}) as ProcessEdgeData;
    const isDefault = d.isDefault ?? false;
    const conditionType = isDefault ? undefined : (d.conditionType ?? "CUSTOM");
    const nativeExpression =
      !isDefault && conditionType === "NATIVE" ? (d.nativeExpression ?? "${false}") : undefined;
    data = { ...d, isDefault, conditionType, nativeExpression };
  }
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
    ...(e.label != null ? { label: e.label } : {}),
    ...(data != null ? { data } : {}),
  };
}

// rawData（保存的结构）→ React Flow nodes/edges。nodes 直接还原；edges 由 createEdge 补回渲染样式。
// rawData 即 add/save 存的 {nodes, edges}（剥样式/运行时），后端透传存储。
// 序列化当前画布为 rawData（保存 + 查看数据共用，保证所见即所存）。
// edges 经 stripEdge 归一化（排他/包容网关出边补必传字段）。
function buildRawData(nodes: ProcessFlowNode[], edges: Edge[]): ProcessRawData {
  return {
    nodes: nodes.map(stripNode),
    edges: edges.map((e) => stripEdge(e, nodes.find((n) => n.id === e.source)?.type)),
  };
}
function nodesFromRaw(raw: unknown): ProcessFlowNode[] {
  const list = (raw as { nodes?: unknown[] } | undefined)?.nodes;
  return Array.isArray(list) ? (list as ProcessFlowNode[]) : [];
}
function edgesFromRaw(raw: unknown): Edge[] {
  const list = (raw as { edges?: Array<{ id?: string; source: string; target: string; label?: unknown; data?: unknown }> } | undefined)?.edges;
  if (!Array.isArray(list)) return [];
  return list.map((e) => {
    const data = e.data as Edge["data"];
    // label 双写兼容：原生 label 优先；缺则回退 data.label（旧数据/后端只在 data 里放 label 的情况）。
    const label = e.label ?? (data as { label?: unknown } | undefined)?.label;
    return createEdge(e.source, e.target, {
      ...(e.id ? { id: e.id } : {}),
      ...(label != null ? { label: label as Edge["label"] } : {}),
      ...(data != null ? { data } : {}),
    });
  });
}

// 流程设计画布：顶栏（返回 + 元信息 + 查看数据 + 模拟运行 + 保存）+ 三栏。
// 左栏节点面板：可拖拽调宽（ResizablePanel）+ 分组 + 滚动 + 搜索（为后续多节点扩展）；右栏固定 w-72：属性配置 / 模拟运行 二选一。
// 删除节点：节点右键弹菜单（固定定位于光标）选「删除」，或键盘 Delete/Backspace（deleteKeyCode）；连带删相关连线。
// 编辑/新增（readOnly=false）：「查看数据」+「模拟运行」+「保存」。查看（readOnly=true）：仅「查看数据」。
export function ProcessDesigner({
  id,
  readOnly = false,
  onBack,
  onSaved,
}: {
  id: number | null;
  readOnly?: boolean;
  onBack: () => void;
  onSaved?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <DesignerInner id={id} readOnly={readOnly} onBack={onBack} onSaved={onSaved} />
    </ReactFlowProvider>
  );
}

function DesignerInner({
  id,
  readOnly,
  onBack,
  onSaved,
}: {
  id: number | null;
  readOnly: boolean;
  onBack: () => void;
  onSaved?: () => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ProcessFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  // 流程表单绑定（rawData.data.globalFormBinding）：formId + formVersion 两级。
  const [formId, setFormId] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");
  // 节点右键菜单：{nodeId, x, y} 打开固定定位菜单。
  const [menu, setMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  // 模拟运行：null=未运行；{running} 运行中 / 已结束（running=false）。activeIds=画布高亮节点。
  const [sim, setSim] = useState<{ running: boolean; runKey: number; activeIds: string[] } | null>(null);
  // 拖节点插入连线：当前拖动命中的 edge id（高亮提示「松手会插进去」）。
  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null);
  // 右栏上下文：点空白（onPaneClick）显流程配置；点节点（有 selectedNode）显节点配置。
  const [paneActive, setPaneActive] = useState(false);
  const { screenToFlowPosition, getEdge } = useReactFlow();

  const editing = !readOnly && !sim;

  // 加载详情（编辑/查看，id!=null）：拉 info 回填元信息 + 画布（nodes/edges 由 rawData 还原）。
  // loading 初值在 state 声明算好（id!=null 即 true），effect 只做异步拉取——避免 effect 内同步 setState（见通用坑）。
  const [loading, setLoading] = useState(id != null);
  useEffect(() => {
    if (id == null) return;
    let cancelled = false;
    getProcessDefinitionInfo(id)
      .then((info) => {
        if (cancelled) return;
        setName(info.processName ?? "");
        setCategory(info.processCategory ?? "");
        setDescription(info.processDescription ?? "");
        const raw = info.rawData;
        const ns = nodesFromRaw(raw);
        setNodes(ns.length > 0 ? ns : initialNodes);
        setEdges(edgesFromRaw(raw));
        // 表单绑定回填（payload 顶层 globalFormBinding，与 processName 同级）。
        setFormId(info.globalFormBinding?.formId ?? "");
        setFormVersion(info.globalFormBinding?.formVersion ?? "");
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof ApiError ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setNodes, setEdges]);

  // 构造 add/save 接口的完整请求体（保存 + 查看数据共用——查看数据看的就是接口真正发送的 body）。
  // 编辑态（id!=null）额外带 id，与 saveProcessDefinition 的入参一致；新建态无 id，与 addProcessDefinition 一致。
  function buildPayload() {
    return {
      ...(id != null ? { id } : {}),
      processName: name.trim(),
      processCategory: category.trim() || undefined,
      processDescription: description.trim() || undefined,
      rawData: buildRawData(nodes, edges),
      // 全局表单绑定：与 processName 同级（payload 顶层，不在 rawData 里）。
      globalFormBinding: { formId, formVersion },
    };
  }

  // 保存：id==null 新建（add）/ id!=null 修改（save）。剥离运行时字段后提交。
  async function save() {
    if (!name.trim()) {
      toast.error("请先在「流程配置」填写流程名称");
      setPaneActive(true); // 引导用户到流程配置
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (id == null) {
        await addProcessDefinition(payload);
        toast.success("已保存草稿");
      } else {
        await saveProcessDefinition({ id: id!, ...payload });
        toast.success("已保存");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  // 单条连线校验：source/target 的 maxOut/maxIn + 自连 + 重复。ignoreEdgeId=校验时排除的边（插入拆分原边用）。
  // 返回 null=允许；否则拒绝原因（onConnect toast）。
  const checkLink = useCallback(
    (sourceId: string | null, targetId: string | null, ignoreEdgeId?: string): string | null => {
      if (!sourceId || !targetId) return "连线无效";
      if (sourceId === targetId) return "不能连接到自身";
      const source = nodes.find((n) => n.id === sourceId);      const target = nodes.find((n) => n.id === targetId);
      if (!source || !target) return "连线无效";
      const sMeta = PROCESS_NODE_REGISTRY[(source.type as ProcessNodeKind) ?? "serviceTask"];
      const tMeta = PROCESS_NODE_REGISTRY[(target.type as ProcessNodeKind) ?? "serviceTask"];
      const pool = edges.filter((e) => e.id !== ignoreEdgeId);
      if (pool.some((e) => e.source === sourceId && e.target === targetId))
        return "两节点间已存在连线";
      if (sMeta.maxOut != null && pool.filter((e) => e.source === sourceId).length >= sMeta.maxOut)
        return `「${sMeta.label}」最多引 ${sMeta.maxOut} 条线`;
      if (tMeta.maxIn != null && pool.filter((e) => e.target === targetId).length >= tMeta.maxIn)
        return `「${tMeta.label}」最多接入 ${tMeta.maxIn} 条线`;
      return null;
    },
    [nodes, edges],
  );

  // 拖拽连线期即时提示（非法目标不高亮）。
  const isValidConnection = useCallback(
    (conn: Edge | Connection) => checkLink(conn.source, conn.target) === null,
    [checkLink],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const reason = checkLink(connection.source, connection.target);
      if (reason) {
        toast.info(reason);
        return;
      }
      if (!connection.source || !connection.target) return;
      setEdges((eds) => addEdge(createEdge(connection.source!, connection.target!), eds));
    },
    [checkLink, setEdges],
  );

  // 是否可插入连线中间（有进有出的节点：任务/网关；start/end 自动排除）。
  const canInsertKind = useCallback(
    (kind: ProcessNodeKind) => {
      const meta = PROCESS_NODE_REGISTRY[kind];
      return meta.target && meta.source;
    },
    [],
  );

  // 把 nodeId 插入 edgeId 中间：A→B 拆成 A→nodeId（保留原边 label/data 等语义，渲染样式由默认外观补）→ nodeId→B。
  // 用一次 setEdges 原子替换（不混用 updateEdge+addEdges 两个内部 batch 调用，时序/样式更可控）。
  const insertIntoEdge = useCallback(
    (nodeId: string, edgeId: string) => {
      const edge = getEdge(edgeId);
      if (!edge) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      if (!canInsertKind((node.type as ProcessNodeKind) ?? "serviceTask")) {
        toast.info("开始/结束节点不能插入连线中间");
        return;
      }
      // 两条新连线都要过约束（忽略被拆的原边）。
      const r1 = checkLink(edge.source, nodeId, edgeId);
      const r2 = checkLink(nodeId, edge.target, edgeId);
      if (r1 || r2) {
        toast.info(r1 ?? r2 ?? "无法插入");
        return;
      }
      setEdges((eds) =>
        eds.flatMap((e) =>
          e.id === edgeId
            ? [
                // 入边：原边改 target=新节点。
                { ...e, target: nodeId },
                // 出边：新节点 → 原 target。
                createEdge(nodeId, edge.target),
              ]
            : [e],
        ),
      );
      toast.success(`已插入「${node.data.label}」`);
    },
    [getEdge, nodes, canInsertKind, checkLink, setEdges],
  );

  // 选中节点（单选），属性面板编辑它。
  const selectedNode = useMemo(() => nodes.find((n) => n.selected), [nodes]);

  function updateSelected(patch: Partial<ProcessNodeData>) {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  }

  // 选中连线（单选），属性面板编辑它。与节点互斥：点节点/空白时 React Flow 会清掉 edge 选中。
  const selectedEdge = useMemo(() => edges.find((e) => e.selected), [edges]);

  // 更新选中连线的 label（原生字段，线上渲染）/ data（业务字段）。
  // label 双写：既走 React Flow 原生 edge.label（画布渲染），也同步一份 edge.data.label（后端统一从 data 读）。
  // 排他网关出边的「是否默认分支」是单选：把某边设为默认时，同源其它出边的 isDefault 一并清掉。
  function updateSelectedEdge(patch: { label?: string; data?: Partial<ProcessEdgeData> }) {
    if (!selectedEdge) return;
    const settingDefault = patch.data?.isDefault === true;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          return {
            ...e,
            ...(patch.label !== undefined ? { label: patch.label === "" ? undefined : patch.label } : {}),
            // label 与 data 合并：patch.data 优先，label 同步进 data.label（空则置 undefined）。
            ...((patch.data !== undefined || patch.label !== undefined)
              ? {
                  data: {
                    ...e.data,
                    ...patch.data,
                    ...(patch.label !== undefined
                      ? { label: patch.label === "" ? undefined : patch.label }
                      : {}),
                  },
                }
              : {}),
          };
        }
        // 同一排他网关的其它出边：新默认产生时取消其默认。
        if (settingDefault && e.source === selectedEdge.source && e.data?.isDefault === true) {
          return { ...e, data: { ...e.data, isDefault: false } };
        }
        return e;
      }),
    );
  }

  // 删除节点 + 连带连线。
  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges],
  );

  // 节点右键 → 打开菜单（回调来自 nodes.tsx 的模块级 handler）。
  useEffect(() => {
    processNodeContextHandler.current = (nodeId, e) => {
      if (!editing) return;
      setMenu({ nodeId, x: e.clientX, y: e.clientY });
    };
    return () => {
      processNodeContextHandler.current = null;
    };
  }, [editing]);

  // 运行/编辑态下禁删（Delete 键）：过滤掉 remove 变更。
  const handleNodesChange = useCallback(
    (changes: NodeChange<ProcessFlowNode>[]) => {
      if (!editing) {
        onNodesChange(changes.filter((c) => c.type !== "remove"));
        return;
      }
      onNodesChange(changes);
    },
    [editing, onNodesChange],
  );

  // 模拟运行：点亮节点 = 给命中节点加 __active 标记（节点卡片读它高亮）。
  const simNodes = useMemo(() => {
    if (!sim) return nodes;
    const active = new Set(sim.activeIds);
    return nodes.map((n) => ({ ...n, data: { ...n.data, __active: active.has(n.id) } }));
  }, [nodes, sim]);

  const startSim = useCallback(() => setSim({ running: true, runKey: Date.now(), activeIds: [] }), []);
  const stopSim = useCallback(() => setSim(null), []);
  const simStep = useCallback((ids: string[]) => setSim((s) => (s ? { ...s, activeIds: ids } : s)), []);
  const simFinish = useCallback(() => setSim((s) => (s ? { ...s, running: false } : s)), []);

  // 节点面板项：拖拽起始，把 kind 写入 dataTransfer。
  function onDragStart(e: React.DragEvent, kind: ProcessNodeKind) {
    e.dataTransfer.setData("application/process-node", kind);
    e.dataTransfer.effectAllowed = "move";
  }

  // 画布内拖动节点：检测中心点是否压在某 edge 热区上，命中则高亮（可插入的节点才检测）。
  // event 为原生 MouseEvent | TouchEvent（非 React 事件），取 clientX/Y 需兼容触摸。
  const onNodeDrag = useCallback(
    (event: MouseEvent | TouchEvent, node: Node) => {
      if (!editing || !canInsertKind((node.type as ProcessNodeKind) ?? "serviceTask")) {
        if (hoverEdgeId) setHoverEdgeId(null);
        return;
      }
      const point = "touches" in event ? event.touches[0] : event;
      if (!point) return;
      const id = hitEdgeIdAt(point.clientX, point.clientY);
      setHoverEdgeId((prev) => (prev === id ? prev : id));
    },
    [editing, canInsertKind, hoverEdgeId],
  );

  // 拖动结束：压着 edge 松手 → 插入该 edge 中间；否则普通落点。
  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      if (!editing) return;
      const edgeId = hoverEdgeId;
      setHoverEdgeId(null);
      if (edgeId) insertIntoEdge(node.id, edgeId);
    },
    [editing, hoverEdgeId, insertIntoEdge],
  );

  // 拖入画布：换算屏幕坐标→画布坐标。落在某 edge 热区上则插入该线中间，否则普通放置。
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!editing) return;
      const kind = e.dataTransfer.getData("application/process-node") as ProcessNodeKind;
      const meta = PROCESS_NODE_REGISTRY[kind];
      if (!meta) return;
      if (meta.unique && nodes.some((n) => n.type === kind)) {
        toast.info(`「${meta.label}」节点已存在，唯一`);
        return;
      }
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const node: ProcessFlowNode = {
        // 节点 id：n_ 前缀（randomUUID 可能数字开头）+ 去连字符，符合 NCName（字母开头、仅字母数字）。
        id: `n_${crypto.randomUUID().replace(/-/g, "")}`,
        type: kind,
        position,
        data: { label: meta.label },
      };
      setNodes((nds) => nds.concat(node));
      // 落点压着连线 → 插入该线中间（仅任务/网关类）。
      const edgeId = hitEdgeIdAt(e.clientX, e.clientY);
      if (edgeId && canInsertKind(kind)) insertIntoEdge(node.id, edgeId);
    },
    [editing, nodes, screenToFlowPosition, setNodes, canInsertKind, insertIntoEdge],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // 左栏：搜索过滤 + 分组（保持 REGISTRY 内 group 顺序）。
  const groupedPalette = useMemo(() => {
    const q = paletteSearch.trim().toLowerCase();
    const list = PROCESS_NODE_LIST.filter((m) => !q || m.label.toLowerCase().includes(q));
    const groups = new Map<string, typeof list>();
    for (const m of list) groups.set(m.group, [...(groups.get(m.group) ?? []), m]);
    return [...groups.entries()];
  }, [paletteSearch]);

  const isDark = useIsDark();
  const edgeBase = isDark ? EDGE_BASE_DARK : EDGE_BASE_LIGHT;
  const edgeActive = isDark ? EDGE_ACTIVE_DARK : EDGE_ACTIVE_LIGHT;
  const edgeDefault = isDark ? EDGE_DEFAULT_DARK : EDGE_DEFAULT_LIGHT;
  // 边显示态：所有边在一个 useMemo 里按 scheme 统一算 style（创建时不烘焙颜色，切明/暗自动跟随）。
  // 单锚点（左进右出），无 handle id，React Flow 自动取唯一 source/target。颜色用具体色值——SVG 解析不到 :root 变量。
  //   常态=中性石墨；默认分支=紫色虚线+「默认」标；hover 待插入/选中=工程蓝（优先于默认色）。
  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const isDefaultEdge = e.data?.isDefault === true;
        if (e.id === hoverEdgeId) {
          return {
            ...e,
            className: "flow-edge-animated",
            animated: true,
            style: { stroke: edgeActive, strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeActive },
          };
        }
        if (e.selected) {
          return {
            ...e,
            style: { stroke: edgeActive, strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: edgeActive },
          };
        }
        if (isDefaultEdge) {
          return {
            ...e,
            // 默认分支：紫色虚线 + 默认标记（无 label 时显示「默认」，有 label 保留用户的）。
            label: e.label ?? "默认",
            labelStyle: { fill: edgeDefault, fontWeight: 600, fontSize: 11 },
            labelBgStyle: { fill: "transparent" },
            style: { stroke: edgeDefault, strokeWidth: 2, strokeDasharray: "7 4" },
            markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeDefault },
          };
        }
        return {
          ...e,
          style: { stroke: edgeBase, strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: edgeBase },
        };
      }),
    [edges, hoverEdgeId, edgeBase, edgeActive, edgeDefault],
  );

  const menuNode = menu ? nodes.find((n) => n.id === menu.nodeId) : undefined;

  // 编辑/查看拉详情中：显示加载占位，避免闪空画布。
  if (loading) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
          <h1 className="font-display text-lg font-semibold">{readOnly ? "查看流程" : "编辑流程"}</h1>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border text-sm text-muted-foreground">
          加载中…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Button>
        <h1 className="font-display text-lg font-semibold">
          {readOnly ? "查看流程" : id == null ? "新增流程" : "编辑流程"}
        </h1>
        <span className="font-mono text-xs text-muted-foreground">
          {id == null ? "v1.0.0" : `#${id}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDataOpen(true)}>
            <Database className="h-4 w-4" />
            查看数据
          </Button>
          {!readOnly &&
            (sim ? (
              <Button variant="outline" size="sm" onClick={stopSim}>
                <Square className="h-4 w-4" />
                停止
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={startSim}>
                <Play className="h-4 w-4" />
                模拟运行
              </Button>
            ))}
          {!readOnly && !sim && (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "保存中…" : "保存"}
            </Button>
          )}
        </div>
      </div>

      {/* 三栏：节点面板 | 画布 | 属性面板（纯 flex 固定宽度，加宽容纳长节点名） */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <aside
          className={cn(
            "flex w-64 shrink-0 flex-col overflow-hidden border-r bg-surface",
            (readOnly || sim) && "pointer-events-none select-none",
          )}
        >
          <div className="border-b p-3 pb-2">
            <h2 className="mb-2 text-xs font-medium text-muted-foreground">节点面板</h2>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="搜索节点"
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 pt-2">
            {groupedPalette.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">无匹配节点</p>
            ) : (
              groupedPalette.map(([group, items]) => (
                <div key={group} className="mb-3">
                  <div className="mb-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">{group}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((meta) => {
                      const Icon = meta.icon;
                      return (
                        <div
                          key={meta.kind}
                          draggable={editing}
                          onDragStart={(e) => onDragStart(e, meta.kind)}
                          title={meta.label}
                          className="flex cursor-grab items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1.5 text-xs transition-colors hover:bg-muted active:cursor-grabbing"
                        >
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", meta.iconChip)}>
                            <Icon className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            拖入画布放置；右键或 Delete 删除节点
          </p>
        </aside>

        <div
          className="min-w-0 flex-1 overflow-hidden bg-muted/30"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={simNodes}
            edges={displayEdges}
            nodeTypes={processNodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onPaneClick={() => setPaneActive(true)}
            onNodeClick={() => setPaneActive(false)}
            onEdgeClick={() => setPaneActive(false)}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            deleteKeyCode={editing ? ["Backspace", "Delete"] : null}
            nodesDraggable={editing}
            nodesConnectable={editing}
            elementsSelectable={!sim}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            {/* 点阵（24px 细点，轻、不抢戏）+ 主网格线（120px，对齐标尺 + 图纸感）折中。
                Background 的 color 是 SVG pattern，解析不到 :root 变量，
                故用具体色值 + useIsDark 切明/暗两档（暗色下要压暗，否则在白底刺眼）。 */}
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
            <MiniMap pannable zoomable className="!bg-background" />
          </ReactFlow>
        </div>

        <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l bg-surface p-3">
          {sim ? (
            <>
              <h2 className="text-xs font-medium text-muted-foreground">模拟运行</h2>
              <ProcessRunPanel
                key={sim.runKey}
                nodes={nodes}
                edges={edges}
                running={sim.running}
                onStep={simStep}
                onFinish={simFinish}
              />
            </>
          ) : selectedNode && !paneActive ? (
            <>
              <h2 className="text-xs font-medium text-muted-foreground">节点配置</h2>
              <NodeConfig node={selectedNode} nodes={nodes} edges={edges} readOnly={readOnly} onChange={updateSelected} />
            </>
          ) : selectedEdge && !paneActive ? (
            <>
              <h2 className="text-xs font-medium text-muted-foreground">连线配置</h2>
              <EdgeConfig edge={selectedEdge} nodes={nodes} readOnly={readOnly} onChange={updateSelectedEdge} />
            </>
          ) : (
            <>
              <h2 className="text-xs font-medium text-muted-foreground">流程配置</h2>
              <ProcessConfig
                id={id}
                name={name}
                category={category}
                description={description}
                formId={formId}
                formVersion={formVersion}
                readOnly={readOnly}
                onNameChange={setName}
                onCategoryChange={setCategory}
                onDescriptionChange={setDescription}
                onFormIdChange={(v) => {
                  setFormId(v);
                  setFormVersion(""); // 换表单清空版本，重选
                }}
                onFormVersionChange={setFormVersion}
              />
            </>
          )}
        </aside>
      </div>

      {/* 节点右键菜单（固定定位于光标） */}
      <ContextMenu open={!!menu} onOpenChange={(o) => !o && setMenu(null)} modal={false}>
        <ContextMenuContent className="fixed z-50 w-36" style={{ left: menu?.x, top: menu?.y }}>
          <ContextMenuItem
            variant="destructive"
            disabled={!menuNode}
            onSelect={() => {
              if (menuNode) removeNode(menuNode.id);
              setMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            删除节点
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <ProcessDataDialog open={dataOpen} onOpenChange={setDataOpen} data={buildPayload()} />
    </div>
  );
}

// 流程属性表单：点空白时展示。名称/分类/描述 + 表单绑定（globalFormBinding：选已发布表单 + 版本，两级联动）。
function ProcessConfig({
  id,
  name,
  category,
  description,
  formId,
  formVersion,
  readOnly,
  onNameChange,
  onCategoryChange,
  onDescriptionChange,
  onFormIdChange,
  onFormVersionChange,
}: {
  id: number | null;
  name: string;
  category: string;
  description: string;
  formId: string;
  formVersion: string;
  readOnly: boolean;
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onFormIdChange: (v: string) => void;
  onFormVersionChange: (v: string) => void;
}) {
  // 已发布表单列表（含历史版本）：挂载拉一次（publishedForms 不传参=全量）。
  const [formOptions, setFormOptions] = useState<DynamicFormPublishedVersion[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getPublishedForms()
      .then((list) => !cancelled && setFormOptions(list))
      .catch(() => !cancelled && setFormOptions([]))
      .finally(() => !cancelled && setFormsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // 当前选中表单的版本列表（两级联动第二级）。
  const selectedForm = formOptions.find((f) => f.formId === formId);
  const versionOptions = selectedForm?.versions ?? [];

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm font-medium">流程</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {id == null ? "未保存" : `#${id}`}
        </span>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="process-name" className="text-xs">流程名称</Label>
        <Input
          id="process-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="流程名称"
          className="h-9"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="process-category" className="text-xs">流程分类</Label>
        <Input
          id="process-category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          placeholder="流程分类"
          className="h-9"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="process-description" className="text-xs">流程描述</Label>
        <Textarea
          id="process-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="流程描述（可选）"
          rows={3}
        />
      </div>

      {/* 表单绑定：选已发布表单 + 版本（两级联动），存 rawData.data.globalFormBinding。 */}
      <div className="grid gap-1.5">
        <Label className="text-xs">绑定表单</Label>
        <Select
          value={formId}
          onValueChange={onFormIdChange}
          disabled={readOnly || formsLoading}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder={formsLoading ? "加载中…" : "选择已发布表单（可选）"} />
          </SelectTrigger>
          <SelectContent position="popper">
            {formOptions.map((f) => (
              <SelectItem key={f.formId} value={f.formId ?? ""}>
                {f.formName ?? f.formId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formId && (
        <div className="grid gap-1.5">
          <Label className="text-xs">表单版本</Label>
          <Select
            value={formVersion}
            onValueChange={onFormVersionChange}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent position="popper">
              {versionOptions.map((v) => (
                <SelectItem key={v.version} value={v.version ?? ""}>
                  {v.version}
                  {v.version === selectedForm?.latestVersion ? "（最新）" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <p className="text-xs text-muted-foreground">流程 key 等字段后续按后端约定扩展。</p>
    </fieldset>
  );
}

// 节点属性表单：名称/备注 + 按 kind 挂专属配置（userTask → UserTaskConfig 审批/候选人）。
function NodeConfig({
  node,
  nodes,
  edges,
  readOnly,
  onChange,
}: {
  node: ProcessFlowNode;
  /** 画布全部节点（userTask 的驳回节点 backNodeId 需要枚举可选节点） */
  nodes: ProcessFlowNode[];
  /** 画布全部连线（驳回节点按图反向可达算上游用） */
  edges: Edge[];
  readOnly: boolean;
  onChange: (patch: Partial<ProcessNodeData>) => void;
}) {
  const meta = PROCESS_NODE_REGISTRY[(node.type as ProcessNodeKind) ?? "serviceTask"];
  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded", meta.iconChip)}>
          <meta.icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{node.type}</span>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="node-label" className="text-xs">名称</Label>
        <Input
          id="node-label"
          value={node.data.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={meta.label}
          className="h-9"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="node-desc" className="text-xs">备注</Label>
        <Textarea
          id="node-desc"
          value={node.data.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="节点说明（可选）"
          rows={3}
        />
      </div>
      {/* userTask 专属：审批类型/通过率/候选人 */}
      {node.type === "userTask" && (
        <UserTaskConfig key={node.id} node={node} nodes={nodes} edges={edges} readOnly={readOnly} onChange={onChange} />
      )}
      {/* serviceTask 专属：委托表达式/异步 */}
      {node.type === "serviceTask" && (
        <ServiceTaskConfig node={node} readOnly={readOnly} onChange={onChange} />
      )}
      {node.type !== "userTask" && node.type !== "serviceTask" && (
        <p className="text-xs text-muted-foreground">
          {node.type === "exclusiveGateway" || node.type === "inclusiveGateway"
            ? "该网关的分支条件挂在出线上（连线条件后续在连线上配置）。"
            : node.type === "parallelGateway"
              ? "并行网关各出线并行执行，无需条件。"
              : "开始/结束节点无额外 BPMN 属性。"}
        </p>
      )}
    </fieldset>
  );
}

// 连线属性表单：label（名称，React Flow 原生字段、直接渲染在线上）+ description（备注，入 edge.data）。
// 两者都随 rawData 保存（stripEdge 保留 label/data；加载 edgesFromRaw 还原）。readOnly 查看态禁用。
function EdgeConfig({
  edge,
  nodes,
  readOnly,
  onChange,
}: {
  edge: Edge;
  /** 画布全部节点（判断源节点是否排他/包容网关，决定是否显示条件配置） */
  nodes: ProcessFlowNode[];
  readOnly: boolean;
  onChange: (patch: { label?: string; data?: Partial<ProcessEdgeData> }) => void;
}) {
  const data = (edge.data ?? {}) as ProcessEdgeData;
  // 仅「源节点是排他/包容网关」的出边可配置条件（并行网关全放行、任务/事件无条件分支）。
  const sourceKind = nodes.find((n) => n.id === edge.source)?.type;
  const isConditionalGateway =
    sourceKind === "exclusiveGateway" || sourceKind === "inclusiveGateway";

  const isDefault = data.isDefault ?? false;
  // conditionType：默认分支留空（不可配条件）；非默认分支缺省 CUSTOM（后续要做的自定义方式）。
  const conditionType = data.conditionType ?? "CUSTOM";
  // 传统表达式：NATIVE 时缺省 ${false}（空值兜底）。
  const nativeExpression =
    conditionType === "NATIVE" ? (data.nativeExpression ?? "${false}") : (data.nativeExpression ?? "");

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <span className="text-sm font-medium">连线</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {edge.source} → {edge.target}
        </span>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edge-label" className="text-xs">名称</Label>
        <Input
          id="edge-label"
          value={typeof edge.label === "string" ? edge.label : ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="连线名称（可选，显示在线上）"
          className="h-9"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="edge-desc" className="text-xs">备注</Label>
        <Textarea
          id="edge-desc"
          value={data.description ?? ""}
          onChange={(e) => onChange({ data: { description: e.target.value } })}
          placeholder="连线说明（可选）"
          rows={3}
        />
      </div>

      {/* 网关出边条件：仅排他/包容网关的出边显示。 */}
      {isConditionalGateway && (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="edge-is-default" className="text-xs">是否默认分支</Label>
            <Switch
              id="edge-is-default"
              checked={isDefault}
              disabled={readOnly}
              onCheckedChange={(c) =>
                // 默认分支不可配条件：选默认时清掉 conditionType/nativeExpression；取消默认时按缺省 CUSTOM。
                onChange({
                  data:
                    c === true
                      ? { isDefault: true, conditionType: undefined, nativeExpression: undefined }
                      : { isDefault: false, conditionType: "CUSTOM" },
                })
              }
            />
          </div>

          {/* 默认分支不走条件：选「默认」后隐藏条件配置（conditionType 留空） */}
          {!isDefault && (
            <>
              <div className="grid gap-1.5">
                <Label className="text-xs">条件类型</Label>
                <Select
                  value={conditionType}
                  onValueChange={(v) =>
                    // 切到 NATIVE 时，nativeExpression 为空则补默认 ${false}（不只是显示兜底，写入数据随 rawData 保存）。
                    onChange({
                      data:
                        v === "NATIVE" && !(data.nativeExpression ?? "").trim()
                          ? { conditionType: v, nativeExpression: "${false}" }
                          : { conditionType: v },
                    })
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="选择条件类型" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="NATIVE">传统表达式</SelectItem>
                    <SelectItem value="CUSTOM">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {conditionType === "NATIVE" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="edge-native-expr" className="text-xs">传统表达式</Label>
                  <Input
                    id="edge-native-expr"
                    value={nativeExpression}
                    disabled={readOnly}
                    onChange={(e) => onChange({ data: { nativeExpression: e.target.value } })}
                    placeholder="如 ${amount > 1000}"
                    className="h-9 font-mono"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}

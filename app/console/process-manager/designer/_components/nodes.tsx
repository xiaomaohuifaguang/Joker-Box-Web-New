"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Play, Square, Settings, User, UserCheck, X, Plus, CircleDot, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessNodeFieldPermission, ProcessGatewayConditionNode } from "@/types/process";

// 节点「带电/选中」信号色：与画布连线同一工程蓝（恒定，不随主题预设），保证任何预设下反馈一致。
// 选中=中性 ring（克制，随主题 --ring）；运行/高亮=蓝色实心 glow（图纸「通电」）。
export const FLOW_ACTIVE = "#2563eb";
// 选中 ring 的统一工具类（neutral ring，CSS 定义在 globals.css）。
export const FLOW_NODE_SELECTED =
  "ring-2 ring-ring ring-offset-2 ring-offset-background";

// 流程节点体系（Flowable 后端，前端出通用图 JSON、后端转 BPMN）。
// node.type 直接用 BPMN 元素名（startEvent/serviceTask/...），后端转 BPMN 时 type 即元素 tag，零映射。
// 形状贴合 BPMN 图形语义（三族组件）：
//   事件(startEvent/endEvent)=圆形(结束双圈)，任务(serviceTask/userTask)=圆角矩形(固定尺寸)，
//   网关(exclusive/parallel/inclusive)=菱形(内嵌 X/+/○ 符号)。名称标签统一放图形正下方。
// 业务属性存 node.data（通用 JSON，字段名与后端约定）。type 注册进 nodeTypes（模块级稳定引用）。
// 连接约束在 meta（maxOut/maxIn/handle 方位），onConnect 统一校验——加节点只改 REGISTRY。

export type ProcessNodeKind =
  | "startEvent"
  | "endEvent"
  | "serviceTask"
  | "userTask"
  | "exclusiveGateway"
  | "parallelGateway"
  | "inclusiveGateway";

export interface ProcessNodeData extends Record<string, unknown> {
  /** 节点显示名 */
  label: string;
  /** 节点备注/描述 */
  description?: string;
  /** 模拟运行高亮（运行时注入，保存前剥离） */
  __active?: boolean;

  // ---- userTask 专属（BPMN 候选人配置）----
  /** 审批类型：0 申请人自审 / 1 会签 / 2 或签 / 3 随机1人 / 4 认领 / 5 随机多人会签 / 6 随机多人或签 / 7 上一节点选择1人 / 8 上一节点选择多人会签 / 9 上一节点选择多人或签 */
  approvalType?: string;
  /** 会签通过率（0~1 两位小数字符串，如 "1.00"；仅会签类 approvalType=1会签/5随机多人会签/8上一节点选择多人会签 时有效） */
  passRate?: string;
  /** 随机人数（正整数，默认 1；仅 approvalType=5/6 随机多人时可配，切走清空；「上一节点选择」7/8/9 由上一节点定人不配） */
  randomCount?: number;
  /** 候选用户 id 集合（逗号间隔，如 "1,2,3"） */
  candidateUsers?: string;
  /** 候选角色 id 集合（逗号间隔） */
  candidateRoles?: string;
  /** 候选部门 id 集合（逗号间隔；树形父子独立选择，选父只要父 id） */
  candidateDepts?: string;
  /** 操作按钮集合（逗号间隔，如 "pass,back,reject"）：pass 通过 / back 驳回 / reject 拒绝 */
  actionButtons?: string;
  /** 驳回方式（勾选「驳回」后显示）：prev 上一节点 / specific 驳回到指定节点 / choose 用户自选 */
  backType?: string;
  /** 驳回节点 id（backType=specific 时显示；当前流程内某节点的 id） */
  backNodeId?: string;
  /** 回退后任务分配策略：auto 智能默认（有上次办理人则派回，无则按配置重分配）/ last_handler 派给上次办理人 / reassign 按 candidate 重分配 */
  backAssigneePolicy?: string;
  /** 是否开启自审批自动通过（String："1" 开启 / "0" 关闭；默认不开启。处理人为申请人时自动通过） */
  autoApproveIfSelf?: string;
  /** 候选 id → 展示名 的运行时映射（__ 前缀，保存前 stripNode 剥离，不入库） */
  __names?: Record<string, string>;

  /** 是否继承主表单字段（仅开始/用户任务；主表单=流程 globalFormBinding 绑定的表单，未选好表单+版本时不可勾选） */
  inheritMainForm?: boolean;
  /** 字段权限（仅 inheritMainForm 勾选时可配；仅收录非默认权限，VISIBLE 不入库；元素见 types/process ProcessNodeFieldPermission） */
  fieldPermissions?: ProcessNodeFieldPermission[];

  // ---- serviceTask 专属（BPMN 服务任务配置）----
  /** 委托表达式（后端服务 bean 名，如 "delegateDemoService"） */
  delegateExpression?: string;
  /** 异步开启 */
  async?: boolean;
}

export type ProcessFlowNode = Node<ProcessNodeData, ProcessNodeKind>;

/** 连线（sequenceFlow）业务数据：存 edge.data，随 rawData 保存。 */
export interface ProcessEdgeData extends Record<string, unknown> {
  /** 连线名称（与 React Flow 原生 edge.label 双写一份，方便后端统一从 data 读） */
  label?: string;
  /** 连线备注/描述（label 走 React Flow 原生 edge.label 直接渲染在线上，同时同步进 data.label） */
  description?: string;

  // ---- 网关出边专属（仅排他/包容网关的出边可配置）----
  /** 是否默认分支（默认 false） */
  isDefault?: boolean;
  /** 条件类型：NATIVE 传统表达式 / CUSTOM 自定义 */
  conditionType?: string;
  /** 传统表达式内容（仅 conditionType=NATIVE 时显示/有效） */
  nativeExpression?: string;
  /** 自定义条件树（仅 conditionType=CUSTOM 时有效；根为 AND/OR 组，元素见 types/process ProcessGatewayConditionNode） */
  ruleTree?: ProcessGatewayConditionNode[];
}

/** 节点分组（左栏分组展示 + 后续扩展用） */
export type ProcessNodeGroup = "事件" | "任务" | "网关";

/** 形状族：决定用哪个节点组件渲染 */
export type NodeShape = "event" | "task" | "gateway";

export interface KindMeta {
  kind: ProcessNodeKind;
  label: string;
  group: ProcessNodeGroup;
  shape: NodeShape;
  icon: LucideIcon;
  /** 连接锚点：开始仅出、结束仅进、任务/网关进出都有 */
  target: boolean;
  source: boolean;
  /** 出线数上限（BPMN：标准开始事件仅一条 outgoing sequenceFlow）。undefined=不限 */
  maxOut?: number;
  /** 入线数上限。undefined=不限 */
  maxIn?: number;
  /** 是否唯一（开始/结束全图各一） */
  unique: boolean;
  /** 形状配色（语义 token，跟随主题） */
  card: string;
  iconChip: string;
}

export const PROCESS_NODE_REGISTRY: Record<ProcessNodeKind, KindMeta> = {
  startEvent: {
    kind: "startEvent",
    label: "开始",
    group: "事件",
    shape: "event",
    icon: Play,
    target: false,
    source: true,
    maxOut: 1,
    unique: true,
    card: "border-emerald-500/60 bg-emerald-500/10",
    iconChip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  endEvent: {
    kind: "endEvent",
    label: "结束",
    group: "事件",
    shape: "event",
    icon: Square,
    target: true,
    source: false,
    unique: true,
    card: "border-rose-500/60 bg-rose-500/10",
    iconChip: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  serviceTask: {
    kind: "serviceTask",
    label: "服务任务",
    group: "任务",
    shape: "task",
    icon: Settings,
    target: true,
    source: true,
    // 任务=顺序活动，最多 1 条出边；分支走排他/包容网关、并行走向并行网关（条件挂网关出线）。
    maxOut: 1,
    unique: false,
    card: "border-primary/50 bg-primary/10",
    iconChip: "bg-primary/15 text-primary",
  },
  userTask: {
    kind: "userTask",
    label: "用户任务",
    group: "任务",
    shape: "task",
    icon: User,
    target: true,
    source: true,
    maxOut: 1,
    unique: false,
    card: "border-sky-500/50 bg-sky-500/10",
    iconChip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  exclusiveGateway: {
    kind: "exclusiveGateway",
    label: "排他网关",
    group: "网关",
    shape: "gateway",
    icon: X,
    target: true,
    source: true,
    unique: false,
    card: "border-amber-500/60 bg-amber-500/10",
    iconChip: "text-amber-600 dark:text-amber-400",
  },
  parallelGateway: {
    kind: "parallelGateway",
    label: "并行网关",
    group: "网关",
    shape: "gateway",
    icon: Plus,
    target: true,
    source: true,
    unique: false,
    card: "border-violet-500/60 bg-violet-500/10",
    iconChip: "text-violet-600 dark:text-violet-400",
  },
  inclusiveGateway: {
    kind: "inclusiveGateway",
    label: "包容网关",
    group: "网关",
    shape: "gateway",
    icon: CircleDot,
    target: true,
    source: true,
    unique: false,
    card: "border-teal-500/60 bg-teal-500/10",
    iconChip: "text-teal-600 dark:text-teal-400",
  },
};

export const PROCESS_NODE_LIST = Object.values(PROCESS_NODE_REGISTRY);

// 申请节点（节点面板预设）：本质是固定 id=applyNode、预置「申请人自审」配置的 userTask。
// 不作为独立 BPMN type 注册（后端 node.type 即元素 tag），落库 type 仍为 userTask，
// 画布渲染/节点配置（UserTaskConfig）天然复用。id 固定 → 全图唯一。
export const APPLY_NODE = {
  /** 面板/拖拽标识（非 BPMN type，onDrop 特判） */
  kind: "__applyNode",
  /** 面板显示名 */
  label: "申请节点",
  /** 节点默认名称（落库 node.data.label） */
  nodeLabel: "申请人",
  /** 固定节点 id（NCName，全图唯一） */
  nodeId: "applyNode",
  group: "任务" as ProcessNodeGroup,
  icon: UserCheck,
  iconChip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  /** 预置配置：申请人自审 + 操作按钮默认「通过」（自动通过默认不勾选） */
  data: {
    approvalType: "0",
    actionButtons: "pass",
  } satisfies Partial<ProcessNodeData>,
};

// 新拖入节点的默认名称：「类型标签+（当前同类型节点数+1)」（用户任务2）。简单计数即可——
// 序号只是帮区分，重名无害（节点靠内部 id 区分）。开始/结束唯一节点不加序号（用默认标签）。
export function nextKindLabel(kind: ProcessNodeKind, nodes: ProcessFlowNode[]): string {
  const meta = PROCESS_NODE_REGISTRY[kind];
  if (meta.unique) return meta.label;
  const count = nodes.filter((n) => n.type === kind).length;
  return `${meta.label}${count + 1}`;
}

// 画布形状显示 label（新节点 label 已含序号「用户任务2」，创建时 nextKindLabel 写入）；空回退类型标签。

// 节点右键回调（模块级）：节点组件是 nodeTypes 稳定引用、拿不到外层闭包，
// 右键时经此把「节点 id + 屏幕坐标」交给外层 ProcessDesigner 打开 ContextMenu。
export const processNodeContextHandler: {
  current: ((nodeId: string, e: { clientX: number; clientY: number }) => void) | null;
} = { current: null };

// 命中检测（供「拖节点插入连线」用，官方 drop-on-edge 思路）：屏幕坐标下是否有 edge 交互热区
// （.react-flow__edge-interaction，由 defaultEdgeOptions.interactionWidth 加宽），返回该 edge id。
// onNodeDrag（画布内拖动）与 onDrop（面板拖入）共用。
export function hitEdgeIdAt(clientX: number, clientY: number): string | null {
  const el = document
    .elementsFromPoint(clientX, clientY)
    .find((n) => n.classList.contains("react-flow__edge-interaction"));
  return el?.parentElement?.dataset.id ?? null;
}

// ---- 共享 ----

function useMeta(type?: string): KindMeta {
  return PROCESS_NODE_REGISTRY[(type as ProcessNodeKind) ?? "serviceTask"];
}

function onContextMenu(id: string, e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  processNodeContextHandler.current?.(id, e);
}

// 名称标签：统一放图形正下方（不挤压形状）。absolute 相对图形盒子定位。
function NodeLabel({ text, active }: { text: string; active?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-full mt-1 w-max max-w-32 -translate-x-1/2 break-words text-center text-[11px] font-medium leading-tight",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {text}
    </div>
  );
}

// ---- 事件：圆形（开始单圈 / 结束双圈），固定尺寸 ----
function EventNode({ id, data, type, selected }: NodeProps) {
  const meta = useMeta(type);
  const d = (data ?? {}) as ProcessNodeData;
  const Icon = meta.icon;
  const isEnd = meta.kind === "endEvent";
  return (
    <div onContextMenu={(e) => onContextMenu(id, e)} className="relative flex items-center justify-center">
      {meta.target && <Handle type="target" position={Position.Left} className="!z-10 !h-2 !w-2" />}
      {/* 结束=双圈（外套一圈），开始=单圈 */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full transition-shadow",
          isEnd ? "h-11 w-11 border-2 p-0.5" : "h-10 w-10 border-2",
          meta.card,
          selected && FLOW_NODE_SELECTED,
          d.__active && "flow-node-active",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            isEnd ? "h-full w-full border-2" : "h-full w-full",
            isEnd && meta.card,
          )}
        >
          <Icon className={cn("h-4 w-4", meta.iconChip)} />
        </div>
      </div>
      {meta.source && <Handle type="source" position={Position.Right} className="!z-10 !h-2 !w-2" />}
      <NodeLabel text={d.label || meta.label} active={selected} />
    </div>
  );
}

// ---- 任务：圆角矩形（固定尺寸），图标 + 内嵌文字 ----
function TaskNode({ id, data, type, selected }: NodeProps) {
  const meta = useMeta(type);
  const d = (data ?? {}) as ProcessNodeData;
  const Icon = meta.icon;
  return (
    <div
      onContextMenu={(e) => onContextMenu(id, e)}
      className={cn(
        // 固定尺寸（w-32 h-8，不可调）；内容居中，过长省略。
        "relative flex h-8 w-32 items-center justify-center gap-1 rounded-md border bg-card px-1.5 py-1 shadow-sm transition-shadow",
        meta.card,
        selected && FLOW_NODE_SELECTED,
        d.__active && "flow-node-active",
      )}
    >
      {meta.target && <Handle type="target" position={Position.Left} className="!z-10 !h-2 !w-2" />}
      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded", meta.iconChip)}>
        <Icon className="h-2.5 w-2.5" />
      </span>
      <span title={d.label || meta.label} className="min-w-0 flex-1 truncate text-center text-[11px] font-medium leading-tight">
        {d.label || meta.label}
      </span>
      {meta.source && <Handle type="source" position={Position.Right} className="!z-10 !h-2 !w-2" />}
    </div>
  );
}

// ---- 网关：菱形（内嵌符号 X/+/○），固定尺寸。进=左角、出=右角 ----
function GatewayNode({ id, data, type, selected }: NodeProps) {
  const meta = useMeta(type);
  const d = (data ?? {}) as ProcessNodeData;
  const Icon = meta.icon;
  return (
    <div onContextMenu={(e) => onContextMenu(id, e)} className="relative flex items-center justify-center">
      {/* 菱形锚点在四个顶点（Left/Right/Top/Bottom 即菱形的角）。句柄要提到菱形之上（!z-10），
          否则落点在旋转方形内侧、被实底菱形盖住无法拖动连线。 */}
      {meta.target && <Handle type="target" position={Position.Left} className="!z-10 !h-2 !w-2" />}
      {meta.source && <Handle type="source" position={Position.Right} className="!z-10 !h-2 !w-2" />}
      <div
        className={cn(
          "flex h-11 w-11 rotate-45 items-center justify-center rounded-[4px] border-2 transition-shadow",
          meta.card,
          selected && FLOW_NODE_SELECTED,
          d.__active && "flow-node-active",
        )}
      >
        {/* 内容反向旋转回正 */}
        <Icon className={cn("h-4 w-4 -rotate-45", meta.iconChip)} />
      </div>
      <NodeLabel text={d.label || meta.label} active={selected} />
    </div>
  );
}

// nodeTypes 稳定引用（模块级），key=BPMN 元素名，按形状族选组件渲染。
export const processNodeTypes = {
  startEvent: EventNode,
  endEvent: EventNode,
  serviceTask: TaskNode,
  userTask: TaskNode,
  exclusiveGateway: GatewayNode,
  parallelGateway: GatewayNode,
  inclusiveGateway: GatewayNode,
};

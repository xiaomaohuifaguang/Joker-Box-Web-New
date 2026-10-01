# components/process-flow — 流程图共享件（设计器 + 前台预览共用）

流程引擎画布的跨端共享层：后台流程设计器（`app/console/process-manager/designer/`）与前台流程预览（申请/审批中心实例页「流程预览」弹窗）共用同一套节点渲染与 rawData 转换。

- `nodes.tsx`：节点体系——`ProcessNodeKind`/`ProcessNodeData`/`ProcessEdgeData` 类型、`PROCESS_NODE_REGISTRY`（分组/形状/锚点/出入线约束/配色）、三个形状族组件（事件圆/任务矩形/网关菱形）、`processNodeTypes` 注册表。另含编辑交互导出（`processNodeContextHandler`/`hitEdgeIdAt`/`APPLY_NODE`/`PROCESS_NODE_LIST`/`nextKindLabel`），仅设计器用。
- `flow-utils.ts`：rawData（`ProcessRawData` = React Flow `{nodes, edges}`，见 `types/process.ts`）→ nodes/edges 的纯函数转换（`nodesFromRaw`/`edgesFromRaw`/`createEdge`/`pickGatewaySourceHandle`/`nodeSizeFor`）+ 边色常量与 `edgeColors(isDark)`。**反方向**（保存路径 stripNode/stripEdge/buildRawData）留在设计器。边色用具体 hex 不用 CSS 变量——SVG path/marker 解析不到 `:root` 上的 var；明/暗靠 `hooks/useIsDark` 切档。
- `ProcessFlowCanvas.tsx`：只读画布（纯展示）：`rawData` + 可选 `track?: ProcessTrack`（流程追踪，见下）。不可拖/连/选，`fitView` 还原持久化的 position（**不重排**），双层 Background + Controls + MiniMap（节点色跟随追踪状态）。自带 `@xyflow/react` 样式 import。**父容器必须显式定高**（如 `h-[70vh]`）。**坑**：受控 `nodes` 且无 `onNodesChange` 时 userNode.measured 永不写回，MiniMap 逐节点门禁不过会整版空白——画布按形状族补 `initialWidth`/`initialHeight`（`initialSizeFor`），详见 CLAUDE.md 通用坑。
- `ProcessFlowButtons.tsx`：自包含入口件（按钮组 + Dialog）。「流程预览」常驻（纯图，无追踪叠加）；传 `track` 时追加「流程追踪」按钮（图例 + 高亮）。两按钮共享一次 `getProcessDefinitionInfo(definitionId, version)` 请求（按 `definitionId|version` 缓存，重复打开不重拉）；`definitionId` 空不渲染；加载 skeleton / 失败重试 / 空数据三态。

**流程追踪契约**：`track` = `ProcessInstance.processTrack`（`types/process.ts`，与 processDefinitionName 同级；`currentNodeId` 仅 info 传 taskId 的处理页返回）。视觉三色（恒定信号色不随预设，`flow.css`）：**绿=已走过**（doneNodeIds 节点 `.flow-node-done` 绿环 / passedEdgeIds 连线绿加粗，走过的默认分支保持虚线变绿）、**蓝=当前**（activeNodeIds `.flow-node-active` glow；currentNodeId 叠加 `.flow-node-current` 脉冲，与并行其余活动节点区分）、**灰=未经过**。节点注入优先级 current > active > done；`__done`/`__current` 与 `__active` 同为运行时字段（`__` 前缀保存时 stripNode 剥离）。弹窗图例随 track 出现，「当前任务」项仅 currentNodeId 存在时显示。

约定：实例视图接入走 `ProcessFlowButtons`（`ProcessWorkHeader` 的 `action` 槽位或自定义 header 直插）；version 一律传实例自身的 `processDefinitionVersion`（预览图与实例版本一致，接口不传 version 则取最新）。

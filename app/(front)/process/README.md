# app/(front)/process — 流程前台（申请中心 + 审批中心）

流程的用户侧：`application/`（申请中心，我发起的）+ `approval/`（审批中心，待我审批的）。两目录平行，各带通用页 `page.tsx` 和分类页 `[type]/page.tsx`（分类如 `/process/application/oa`，静态导出靠 `generateStaticParams` 枚举 type，新 type 要重新 build）。均 `<RequirePermission>`。

分类 type 注册表在 `lib/process-types.ts`（`PROCESS_TYPES: { type, name }[]`，含默认分类 `{ type:"default", name:"默认分类" }`，`DEFAULT_PROCESS_TYPE`）。**通用页 = 默认分类页**：`/process/application` `/process/approval`（路由不带 default）接口按 `processCategory=default` 传参（Inner 里 `processType ?? DEFAULT_PROCESS_TYPE`）；`generateStaticParams` 从注册表派生但**排除 default**（不产出 /default 路由），新增 type 只改注册表。两中心列表标题用 `processTypeName(processType)` 拼前缀（如「OA申请中心」；**默认分类/通用页不拼名**，仍「申请中心」；未知 type 返回 `""`）。将来 type 与后台配置联动时只换该文件数据源。

## 视图编排（两目录同一套约定）

state 驱动视图 + **原生 `window.history.pushState` 同步 URL**（可分享/刷新/前进后退），**不用 `router.push`**（静态导出下同 path 仅改 query 的软导航不可靠，见 CLAUDE.md 通用坑）。`useSearchParams` 是权威来源（外部 `<Link>` 互跳/前进后退必更新），内部 `go()` 跳转用 `override` 覆盖层立即生效（pushState 不经 Next 路由、不重渲染）；`popstate` 用 `window.location` 重算兜底。视图 = 判别联合 `View`（`name` + 参数），`parseView`/`viewToUrl` 双向映射 query。

- **申请中心** `ApplicationInner`：`list`（发起区块 + 我的流程列表）/ `start` 发起 / `detail` 查看 / `edit` 草稿编辑 / `handle` 待处理（复用审批中心 `HandleView`，pass 文案改「提交」）。
- **审批中心** `ApprovalInner`：`list` / `detail`，detail 按 `kind` 分 `handle`（待办处理，可编辑表单）/ `claim`（待认领，只读+确认认领）/ `view`（已办，只读）。

## 数据接口（`lib/api/process.ts`，类型见 `types/process.ts`）

- 列表：`useProcessInstancePage` → `POST /processInstance/queryPage`（body 带 `processCategory`=路由 `[type]`，通用页=默认分类传 `default`；两个 Inner 透传到列表面板）。申请 tab `INSTANCE_TABS`（待处理6/进行中1/全部5/草稿0），审批 tab `APPROVAL_INSTANCE_TABS`（待办2/待认领3/已办4）。
- 发起区块：`StartProcessSection` → `POST /processDefinition/deployList`（**query 传 `processCategory`**，同上通用页传 `default`）。
- 详情：`getProcessInstanceInfo(id, taskId?)` → `POST /processInstance/info`（**query 传参**，审批/处理场景带 taskId）。`ProcessInstance.taskName`（与 taskId 同级，待办/待认领列表 + 处理/认领详情返回）：审批列表「任务」列**仅待办(2)/待认领(3)渲染**（常驻可见——同实例多任务行的关键区分；已办(4) 不渲染该列），详情页走 `ProcessWorkHeader` 的 `taskName`（副标下「当前任务」行）。
- 发起定义信息：`getProcessDefinitionStartInfo` → `POST /processDefinition/startInfo`（query 传 processDefinitionId）。
- 流程预览/追踪：`getProcessDefinitionInfo(id, version?)` → `POST /processDefinition/info`（body id + query 可选 version，不传=最新）。入口=`components/process-flow` 的 `ProcessFlowButtons`（「流程预览」常驻纯图；传 `track` 追加「流程追踪」按钮；两按钮共享一次请求、按 `definitionId|version` 缓存）：DetailView/HandleView 走 `ProcessWorkHeader` 的 `action` 槽位，StartView/EditView 自定义 header 直插；version 一律传实例自身的 `processDefinitionVersion`（预览图与实例版本一致）。**流程追踪**：`processInstance/info` 返回 `processTrack`（doneNodeIds/passedEdgeIds/activeNodeIds/currentNodeId，后者仅处理页带 taskId 时返回）——DetailView/HandleView 透传给按钮组（绿=已走过/蓝=当前/灰=未经过 + 图例，视觉契约见 `components/process-flow/README.md`）；StartView/EditView 无 track 只有「流程预览」。
- 动作：`start` / `saveDraft` / `claim` / `pass` / `reject` / `back`，body 均 `ProcessHandleParam`，响应只看 code。

## 共享件（`_components/`，申请/审批跨目录复用，申请侧放 application/_components）

- `ProcessForm.tsx`：流程表单接入。`hasProcessForm` 判空、`seedProcessFormValues` 回填草稿 value、`ProcessFormFields` 把节点**字段权限 permission**（HIDDEN/READONLY/REQUIRED，优先级高于表单设计配置）映射进字段后用共享 `DynamicFormRenderer` 渲染。readOnly=整表只读（查看态）；linkage=是否引入联动（查看默认不引入，可用「按联动显示」开关切）。
- `ProcessWorkHeader.tsx`：详情头部（编号/标题/流程名版本/状态徽标）。
- `NextTaskCandidatePicker.tsx`：下一用户任务候选人选择（审批类型 **7/8/9 上一节点选择**）。仅渲染需选人的节点（type∈{7,8,9} 且有 candidateUsers，候选人后端已给定、只含 id+nickname，不走远程搜索）；每节点一个**选择器**（触发器 + 内联绝对定位下拉面板不 portal、面板带搜索，交互对齐动态表单 `MultiSelectControl`：div role=button + pointerdown 外部收起），7 单选、8/9 多选。值=`Record<nodeId, number[]>`，提交装进 `ProcessHandleParam.nodeCandidateUsersChoose`；`missingChooseNodes()` 校验。**坑**：`nodeId` 是该功能前提（选择器 React key + `nodeCandidateUsersChoose` 的 map key 都用它），后端若不返回会表现为「选项能 hover 但点击无效 + 控制台 duplicate empty key 警告」——选择器 `onChange` 有 `nodeId != null` 守卫会静默吞掉点击。

## 表单 + 下一任务选人的提交/校验约定（Start/Edit/Handle 三视图一致）

- 填表单（`taskForm`/`startForm`）+ 选人（`nextUserTaskInfos` 里 7/8/9）→ 提交 `ProcessHandleParam`。
- 校验时机：**「发起 start / 通过 pass」才强制**——表单必填（`rendererRef.validate()`）+ 7/8/9 选人（`missingChooseNodes`）；**存草稿 saveDraft / 驳回 back / 拒绝 reject 不校验**。
- `nextUserTaskInfos`：startInfo 与 `processName` 同级、info 与 `processDefinitionName` 同级；**仅 7/8/9 返回 candidateUsers**，其它审批类型不返回、前台不展示。

## 各 `_components/`

- 申请：`InstanceListPanel`（tab+搜索+表格+分页；操作列 待处理=处理/草稿=编辑/其他=查看；**行 key=id+taskId 复合**——待处理 tab 同一实例可多任务多行，单 id 撞 key）、`StartProcessSection`（搜索式下拉选已发布流程）、`StartView`（发起）、`EditView`（草稿编辑，body 带 processInstanceId）、`DetailView`（只读详情 + 待认领时「确认认领」）。
- 审批：`ApprovalListPanel`（tab+列表；操作进 handle/claim/view；行 key 同上做 id+taskId 复合——待办/待认领同一实例多任务多行）、`HandleView`（处理：可编辑表单+联动 + 审批操作 pass/reject/back，点按钮弹确认框可填意见；back 仅 backType=choose 需选目标节点）。
